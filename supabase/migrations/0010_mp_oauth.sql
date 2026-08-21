-- =============================================================
-- Conexão da conta Mercado Pago pelo painel (OAuth)
--
-- Até aqui a conta que recebia o dinheiro era o secret MP_ACCESS_TOKEN das
-- Edge Functions: trocar exigia acesso ao servidor. Agora a Mirian conecta a
-- conta dela sozinha, pelo painel, e o token nunca passa pelo navegador — quem
-- troca o código pelo token é a Edge Function mp-oauth.
--
-- O token fica numa tabela sem policy nenhuma: com RLS ligada e zero policies,
-- só o service_role (as Edge Functions) enxerga. Nem admin logado lê.
-- O painel vê o status por uma função security definer que devolve apenas
-- campos inócuos — nunca o token.
-- =============================================================

-- -------------------------------------------------------------
-- 1. A conexão (uma linha só)
-- -------------------------------------------------------------
create table if not exists public.payment_connection (
  id            boolean primary key default true,
  provider      text        not null default 'mercadopago',
  mp_user_id    text,
  nickname      text,
  email         text,
  access_token  text,
  refresh_token text,
  public_key    text,
  live_mode     boolean,
  expires_at    timestamptz,
  connected_by  uuid references auth.users(id) on delete set null,
  connected_at  timestamptz,
  updated_at    timestamptz not null default now(),
  -- trava a tabela em no máximo uma linha
  constraint payment_connection_singleton check (id)
);

alter table public.payment_connection enable row level security;
-- Sem policies de propósito: só service_role passa.

-- -------------------------------------------------------------
-- 2. Proteção de CSRF do fluxo OAuth
--    O state é criado quando o admin clica em Conectar e conferido no retorno.
--    Sem isso, um terceiro poderia forjar o callback e plugar a conta dele.
-- -------------------------------------------------------------
create table if not exists public.mp_oauth_state (
  state       text primary key,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.mp_oauth_state enable row level security;
-- Sem policies: idem.

-- Estados velhos não servem para nada e não devem ficar guardados.
create or replace function public.purge_mp_oauth_state()
returns void language sql security definer set search_path = public as $$
  delete from public.mp_oauth_state where created_at < now() - interval '30 minutes';
$$;

revoke all on function public.purge_mp_oauth_state() from public, anon, authenticated;

-- -------------------------------------------------------------
-- 3. O que o painel pode ver
--    Devolve o suficiente para a tela dizer "conectado como fulano desde tal
--    dia" — e nada que sirva para cobrar em nome de alguém.
-- -------------------------------------------------------------
create or replace function public.payment_connection_status()
returns table (
  conectado    boolean,
  provider     text,
  mp_user_id   text,
  nickname     text,
  email        text,
  live_mode    boolean,
  connected_at timestamptz,
  expira_em    timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;

  return query
  select
    c.access_token is not null,
    c.provider,
    c.mp_user_id,
    c.nickname,
    c.email,
    c.live_mode,
    c.connected_at,
    c.expires_at
  from public.payment_connection c
  where c.id;

  -- Nunca conectou: devolve uma linha dizendo isso, para a tela não quebrar.
  if not found then
    return query select false, 'mercadopago'::text, null::text, null::text,
                        null::text, null::boolean, null::timestamptz, null::timestamptz;
  end if;
end $$;

revoke all on function public.payment_connection_status() from public, anon;
grant execute on function public.payment_connection_status() to authenticated;
