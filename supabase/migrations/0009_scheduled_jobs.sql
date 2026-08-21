-- =============================================================
-- Rotinas agendadas (21/08/2026)
--
-- Até aqui nada rodava sozinho: a fila de e-mails nunca era drenada, os
-- lembretes de renovação nunca saíam e uma assinatura vencida continuava
-- marcada como 'active' para sempre. O acesso já era bloqueado corretamente
-- (a data está na regra de public.current_tier), mas os painéis mostravam
-- aluna em dia enquanto ela via tudo trancado.
--
-- A expiração é ligada aqui e já roda. Os dois jobs que chamam Edge Function
-- dependem do Resend, então ficam prontos mas desligados — veja o item 4.
-- =============================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- -------------------------------------------------------------
-- 1. Novo status 'expired'
--    'past_due' quer dizer "a cobrança falhou" e vem do webhook do Mercado
--    Pago. Fim de período sem renovação é outra coisa — e a aluna precisa
--    ler "Vencida", não "Pagamento atrasado".
--
--    O valor é adicionado fora deste arquivo porque ALTER TYPE ... ADD VALUE
--    não roda dentro de bloco de transação:
--      alter type public.subscription_status add value if not exists 'expired';
-- -------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'subscription_status' and e.enumlabel = 'expired'
  ) then
    raise exception 'rode antes, sozinho: alter type public.subscription_status add value ''expired''';
  end if;
end $$;

-- -------------------------------------------------------------
-- 2. Expiração automática
--    Mesma regra de public.current_tier, para o banco e as telas contarem a
--    mesma história. Assinatura sem data de fim (avulso vitalício) fica de
--    fora de propósito.
-- -------------------------------------------------------------
create or replace function public.expire_subscriptions()
returns integer language plpgsql security definer set search_path = public as $$
declare
  afetadas integer;
begin
  update public.subscriptions
     set status = 'expired', updated_at = now()
   where status in ('active', 'trialing')
     and current_period_end is not null
     and current_period_end < now();
  get diagnostics afetadas = row_count;
  return afetadas;
end $$;

revoke all on function public.expire_subscriptions() from public, anon, authenticated;

-- -------------------------------------------------------------
-- 3. Agendamento da expiração — todo dia às 03:10 UTC (00:10 em Brasília)
-- -------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expirar-assinaturas') then
    perform cron.unschedule('expirar-assinaturas');
  end if;
end $$;

select cron.schedule(
  'expirar-assinaturas',
  '10 3 * * *',
  $$select public.expire_subscriptions()$$
);

-- -------------------------------------------------------------
-- 4. Jobs de e-mail — prontos, mas só ligam quando o Resend existir
--
--    As duas Edge Functions exigem o header 'x-cron-secret'. O segredo fica
--    no Vault e nunca no corpo do job (cron.job é legível por quem tem
--    acesso ao banco). Depois de configurar RESEND_API_KEY e EMAIL_FROM,
--    rode UMA vez, trocando pelo mesmo valor do secret CRON_SECRET:
--
--      select public.ativar_jobs_de_email('<mesmo valor de CRON_SECRET>');
--
--    Para desligar de novo: select public.desativar_jobs_de_email();
-- -------------------------------------------------------------
create or replace function public.ativar_jobs_de_email(p_cron_secret text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  base text := 'https://fzpmypayekcpwvhapgsk.supabase.co/functions/v1/';
begin
  if coalesce(p_cron_secret, '') = '' then
    raise exception 'informe o mesmo valor do secret CRON_SECRET das Edge Functions';
  end if;

  -- guarda/atualiza o segredo no Vault
  if exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'cron_secret'),
      p_cron_secret
    );
  else
    perform vault.create_secret(p_cron_secret, 'cron_secret',
      'Header x-cron-secret das Edge Functions send-emails e renewal-reminders');
  end if;

  perform public.desativar_jobs_de_email();

  -- fila de e-mails: a cada 5 minutos
  perform cron.schedule('drenar-fila-de-emails', '*/5 * * * *', format($job$
    select net.http_post(
      url     := %L,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
                 ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $job$, base || 'send-emails'));

  -- lembretes de renovação: todo dia às 12:00 UTC (09:00 em Brasília)
  perform cron.schedule('lembretes-de-renovacao', '0 12 * * *', format($job$
    select net.http_post(
      url     := %L,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
                 ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$, base || 'renewal-reminders'));

  return 'jobs de e-mail ligados: drenar-fila-de-emails (5 min) e lembretes-de-renovacao (diário)';
end $$;

create or replace function public.desativar_jobs_de_email()
returns void language plpgsql security definer set search_path = public as $$
declare
  j text;
begin
  foreach j in array array['drenar-fila-de-emails', 'lembretes-de-renovacao']
  loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

revoke all on function public.ativar_jobs_de_email(text)  from public, anon, authenticated;
revoke all on function public.desativar_jobs_de_email()   from public, anon, authenticated;
