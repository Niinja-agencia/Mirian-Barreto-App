-- Auditoria + idempotência de webhooks (Mercado Pago etc.)
create table if not exists public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,            -- 'mercadopago'
  event_key    text not null,            -- ex: 'payment:123' | 'preapproval:abc'
  type         text,
  payload      jsonb,
  processed_at timestamptz not null default now(),
  unique (source, event_key)
);

alter table public.webhook_events enable row level security;
-- Sem policies para anon/authenticated: só service_role (edge function) acessa.
drop policy if exists webhook_admin_read on public.webhook_events;
create policy webhook_admin_read on public.webhook_events
  for select using (public.is_admin(auth.uid()));
