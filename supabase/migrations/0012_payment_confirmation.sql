-- Payment changes and entitlement creation must be atomic. The checkout stores
-- the purchased term here instead of trusting webhook metadata.
alter table public.payments
  add column if not exists billing_context text not null default 'monthly'
    check (billing_context in ('once', 'monthly', 'annual'));
alter table public.payments
  add column if not exists mp_authorized_payment_id text unique;
alter table public.subscriptions
  add column if not exists agreed_amount numeric(10,2) check (agreed_amount > 0);

-- Pending checkouts created before this migration did not store the term.
update public.payments p set billing_context = 'once'
from public.plans pl
where p.plan_id = pl.id and pl.slug = 'avulso' and p.status = 'pending';
update public.payments set billing_context = 'annual'
where status = 'pending' and description like '%(anual)%';

create or replace function public.apply_mp_payment(
  p_payment_id uuid,
  p_mp_payment_id text,
  p_amount numeric,
  p_status public.payment_status,
  p_raw jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  existing public.payments%rowtype;
  new_subscription_id uuid;
  access_created boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Somente o backend pode confirmar pagamentos';
  end if;

  select * into existing from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pagamento local não encontrado'; end if;
  if existing.amount <> p_amount then raise exception 'Valor do pagamento divergente'; end if;
  if existing.mp_payment_id is not null and existing.mp_payment_id <> p_mp_payment_id then
    raise exception 'Identificador do pagamento divergente';
  end if;

  if existing.status = 'approved' and p_status in ('pending', 'rejected') then
    return false;
  end if;
  if existing.status in ('refunded', 'charged_back', 'canceled')
     and p_status in ('pending', 'rejected', 'approved') then
    return false;
  end if;

  if p_status = 'approved' and existing.subscription_id is null then
    insert into public.subscriptions (
      user_id, plan_id, status, billing, current_period_start, current_period_end
    ) values (
      existing.user_id, existing.plan_id, 'active',
      case when existing.billing_context = 'annual' then 'annual'::public.billing_interval
           else 'monthly'::public.billing_interval end,
      now(),
      case existing.billing_context
        when 'once' then null
        when 'annual' then now() + interval '12 months'
        else now() + interval '1 month'
      end
    ) returning id into new_subscription_id;
    access_created := true;
  end if;

  update public.payments set
    mp_payment_id = p_mp_payment_id,
    status = p_status,
    raw = p_raw,
    subscription_id = coalesce(existing.subscription_id, new_subscription_id),
    paid_at = case when p_status = 'approved' then coalesce(existing.paid_at, now()) else existing.paid_at end
  where id = p_payment_id;

  if p_status in ('refunded', 'charged_back', 'canceled')
     and existing.subscription_id is not null then
    update public.subscriptions set status = 'canceled', canceled_at = now()
    where id = existing.subscription_id;
  end if;
  return access_created;
end $$;

revoke all on function public.apply_mp_payment(uuid, text, numeric, public.payment_status, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_mp_payment(uuid, text, numeric, public.payment_status, jsonb)
  to service_role;

create or replace function public.apply_mp_renewal(
  p_subscription_id uuid,
  p_authorized_payment_id text,
  p_mp_payment_id text,
  p_amount numeric,
  p_raw jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  existing public.subscriptions%rowtype;
  base_time timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Somente o backend pode confirmar renovações';
  end if;
  select * into existing from public.subscriptions
    where id = p_subscription_id for update;
  if not found then raise exception 'Assinatura não encontrada'; end if;
  if existing.agreed_amount is not null and existing.agreed_amount <> p_amount then
    raise exception 'Valor da renovação divergente';
  end if;
  if exists(select 1 from public.payments
            where mp_authorized_payment_id = p_authorized_payment_id) then
    return false;
  end if;

  insert into public.payments (
    user_id, subscription_id, plan_id, amount, method, status,
    mp_payment_id, mp_authorized_payment_id, description, raw, paid_at
  ) values (
    existing.user_id, existing.id, existing.plan_id, p_amount, 'credit_card',
    'approved', nullif(p_mp_payment_id, ''), p_authorized_payment_id,
    'Renovação da assinatura', p_raw, now()
  );

  base_time := greatest(coalesce(existing.current_period_end, now()), now());
  update public.subscriptions set
    status = 'active',
    current_period_start = now(),
    current_period_end = base_time +
      case when existing.billing = 'annual' then interval '12 months'
           else interval '1 month' end
  where id = existing.id;
  return true;
end $$;

revoke all on function public.apply_mp_renewal(uuid, text, text, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_mp_renewal(uuid, text, text, numeric, jsonb)
  to service_role;
