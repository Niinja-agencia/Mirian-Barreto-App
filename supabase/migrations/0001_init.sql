-- =============================================================
-- Mirian Barreto — App de Treinos
-- Migração inicial: schema + RLS (Fases 0–5)
-- =============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type public.user_role as enum ('aluno', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fitness_level as enum ('iniciante', 'intermediario', 'avancado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_interval as enum ('monthly', 'annual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('pending','trialing','active','past_due','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','approved','rejected','refunded','canceled','charged_back');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('pix','credit_card','boleto');
exception when duplicate_object then null; end $$;

-- ---------- Função utilitária: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================
-- profiles  (1:1 com auth.users)
-- =============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        public.user_role    not null default 'aluno',
  level       public.fitness_level not null default 'iniciante',
  avatar_url  text,
  locale      text not null default 'pt',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria profile automaticamente quando um usuário é criado no Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- plans
-- =============================================================
create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,           -- basic | premium | vip
  tier            int  not null,                  -- 1 < 2 < 3 (usado p/ comparar acesso)
  name_pt         text not null,
  name_en         text not null,
  description_pt  text,
  description_en  text,
  price_monthly   numeric(10,2) not null,
  price_annual    numeric(10,2) not null,
  features_pt     jsonb not null default '[]',
  features_en     jsonb not null default '[]',
  highlighted     boolean not null default false,
  active          boolean not null default true,
  sort_order      int not null default 0,
  -- ids dos planos de assinatura no Mercado Pago (preenchidos pelo admin/edge)
  mp_plan_monthly_id text,
  mp_plan_annual_id  text,
  created_at      timestamptz not null default now()
);

-- =============================================================
-- subscriptions
-- =============================================================
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  plan_id              uuid not null references public.plans(id),
  status               public.subscription_status not null default 'pending',
  billing              public.billing_interval not null default 'monthly',
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  mp_preapproval_id    text,                       -- id da assinatura recorrente no MP
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create unique index if not exists uq_sub_mp_preapproval
  on public.subscriptions(mp_preapproval_id) where mp_preapproval_id is not null;
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =============================================================
-- payments
-- =============================================================
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_id         uuid references public.plans(id),
  amount          numeric(10,2) not null,
  method          public.payment_method not null,
  status          public.payment_status not null default 'pending',
  mp_payment_id   text unique,                     -- id do pagamento no MP (idempotência)
  description     text,
  raw             jsonb,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_payments_user on public.payments(user_id);

-- =============================================================
-- workout_categories
-- =============================================================
create table if not exists public.workout_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_pt     text not null,
  name_en     text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- workouts
-- =============================================================
create table if not exists public.workouts (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.workout_categories(id) on delete set null,
  title_pt        text not null,
  title_en        text not null,
  description_pt  text,
  description_en  text,
  level           public.fitness_level not null default 'iniciante',
  duration_seconds int not null default 0,
  video_path      text,        -- caminho do objeto no bucket privado 'workout-videos'
  thumbnail_path  text,        -- caminho no bucket público 'thumbnails'
  required_tier   int not null default 1,   -- tier mínimo do plano para assistir
  published       boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_workouts_category on public.workouts(category_id);
create index if not exists idx_workouts_published on public.workouts(published);
drop trigger if exists trg_workouts_updated on public.workouts;
create trigger trg_workouts_updated before update on public.workouts
  for each row execute function public.set_updated_at();

-- =============================================================
-- workout_progress
-- =============================================================
create table if not exists public.workout_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, workout_id)
);
create index if not exists idx_progress_user on public.workout_progress(user_id);

-- =============================================================
-- email_outbox  (Fase 4 — automação)
-- =============================================================
create table if not exists public.email_outbox (
  id           uuid primary key default gen_random_uuid(),
  to_email     text not null,
  template     text not null,            -- welcome | payment_approved | renewal_reminder | payment_failed
  payload      jsonb not null default '{}',
  status       text not null default 'pending',  -- pending | sent | failed
  attempts     int not null default 0,
  error        text,
  scheduled_at timestamptz not null default now(),
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_email_outbox_status on public.email_outbox(status, scheduled_at);

-- =============================================================
-- Helpers de acesso (SECURITY DEFINER p/ uso em policies)
-- =============================================================
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

-- maior tier com assinatura ativa e período vigente (0 = sem acesso)
create or replace function public.current_tier(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(pl.tier), 0)
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = uid
    and s.status in ('active','trialing')
    and (s.current_period_end is null or s.current_period_end > now());
$$;

-- =============================================================
-- RLS
-- =============================================================
alter table public.profiles            enable row level security;
alter table public.plans               enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.payments            enable row level security;
alter table public.workout_categories  enable row level security;
alter table public.workouts            enable row level security;
alter table public.workout_progress    enable row level security;
alter table public.email_outbox        enable row level security;

-- profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

-- plans (catálogo público de planos ativos; admin gerencia tudo)
drop policy if exists plans_select_public on public.plans;
create policy plans_select_public on public.plans
  for select using (active = true or public.is_admin(auth.uid()));
drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- subscriptions (só leitura do próprio; escrita via service_role nas edge functions)
drop policy if exists subs_select_own on public.subscriptions;
create policy subs_select_own on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- payments
drop policy if exists pay_select_own on public.payments;
create policy pay_select_own on public.payments
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- workout_categories (qualquer usuário autenticado lê; admin gerencia)
drop policy if exists cat_select_auth on public.workout_categories;
create policy cat_select_auth on public.workout_categories
  for select using (auth.uid() is not null);
drop policy if exists cat_admin_write on public.workout_categories;
create policy cat_admin_write on public.workout_categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- workouts: catálogo (metadados + thumbnail) visível a qualquer aluna logada —
-- isso permite ver/desbloquear conteúdo de tiers superiores (upsell).
-- O acesso ao VÍDEO em si é gated server-side pela Edge Function 'video-url',
-- que valida o plano ativo antes de gerar a URL assinada.
drop policy if exists workouts_select_entitled on public.workouts;
drop policy if exists workouts_select_published on public.workouts;
create policy workouts_select_published on public.workouts
  for select using (
    public.is_admin(auth.uid())
    or (published = true and auth.uid() is not null)
  );
drop policy if exists workouts_admin_write on public.workouts;
create policy workouts_admin_write on public.workouts
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- workout_progress (cada aluno gerencia o próprio)
drop policy if exists progress_rw_own on public.workout_progress;
create policy progress_rw_own on public.workout_progress
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid());

-- email_outbox (somente admin lê; escrita via service_role)
drop policy if exists email_admin_read on public.email_outbox;
create policy email_admin_read on public.email_outbox
  for select using (public.is_admin(auth.uid()));

-- =============================================================
-- Storage buckets
-- =============================================================
insert into storage.buckets (id, name, public)
  values ('workout-videos','workout-videos', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('thumbnails','thumbnails', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('avatars','avatars', true)
  on conflict (id) do nothing;

-- thumbnails/avatars: leitura pública; escrita só admin
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects
  for select using (bucket_id in ('thumbnails','avatars'));

drop policy if exists storage_admin_write on storage.objects;
create policy storage_admin_write on storage.objects
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- vídeos: NUNCA leitura direta pelo cliente. O acesso é só via URL assinada
-- gerada pela Edge Function 'video-url' (que valida assinatura ativa).
-- Por isso não criamos policy de SELECT em 'workout-videos' para authenticated/anon.
