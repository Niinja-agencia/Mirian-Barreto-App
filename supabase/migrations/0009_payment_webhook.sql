-- Processa cada mudança de pagamento sob lock, sem bloquear a aprovação que
-- chega depois da notificação inicial de pagamento pendente.
alter table public.subscriptions
  add column if not exists agreed_amount numeric(10,2) check (agreed_amount > 0);

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
  plan_slug text;
  new_subscription_id uuid;
  access_created boolean := false;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception 'Somente o backend pode confirmar pagamentos';
  end if;

  select * into existing from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pagamento local não encontrado'; end if;
  if existing.amount <> p_amount then raise exception 'Valor do pagamento divergente'; end if;
  if existing.mp_payment_id is not null and existing.mp_payment_id <> p_mp_payment_id then
    raise exception 'Identificador do pagamento divergente';
  end if;

  -- Uma notificação antiga de pending não pode desfazer acesso já aprovado.
  if existing.status = 'approved' and p_status in ('pending', 'rejected') then
    return false;
  end if;

  if p_status = 'approved' and existing.subscription_id is null then
    select slug into plan_slug from public.plans where id = existing.plan_id;
    insert into public.subscriptions (
      user_id, plan_id, status, billing, current_period_start, current_period_end
    ) values (
      existing.user_id, existing.plan_id, 'active', 'monthly', now(),
      case when plan_slug = 'avulso' then null else now() + interval '1 month' end
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
revoke all on function public.apply_mp_payment(uuid, text, numeric, public.payment_status, jsonb) from public, anon, authenticated;
grant execute on function public.apply_mp_payment(uuid, text, numeric, public.payment_status, jsonb) to service_role;

-- Uma assinatura recorrente cancelada conserva o acesso até o fim do período pago.
create or replace function public.current_tier(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(pl.tier), 0)
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = uid
    and (s.status in ('active','trialing')
      or (s.status = 'canceled' and s.cancel_at_period_end))
    and (s.current_period_end is null or s.current_period_end > now());
$$;
