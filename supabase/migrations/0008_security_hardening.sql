-- =============================================================
-- Correções de segurança (auditoria 21/08/2026)
--
-- 1. Impede que uma aluna se promova a admin escrevendo no próprio profile.
-- 2. Tira o youtube_id do alcance do cliente: ele passa a viver numa tabela
--    com RLS que valida o plano, em vez de vir junto no select dos treinos.
--
-- Compatível com o front-end já publicado: nada aqui quebra `select *`.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Escalação de privilégio
--    A policy profiles_update_self libera update na própria linha e não
--    restringe colunas — o que permitia `update profiles set role='admin'`.
--    RLS não faz máscara de coluna, então a trava vai num trigger.
-- -------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Conexão direta ao banco (psql, migrações, seed): sem JWT, deixa passar.
  if current_setting('request.jwt.claims', true) is null then
    return new;
  end if;

  -- Edge Functions (service_role) e admins continuam podendo mudar o papel.
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'alteracao de role nao permitida'
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- -------------------------------------------------------------
-- 2. youtube_id fora do alcance do cliente
--    A RLS de workouts libera todas as colunas do treino publicado para
--    qualquer usuário autenticado. Com o youtube_id junto, o bloqueio de
--    plano virava enfeite: bastava ler a resposta da API.
--    O vídeo hospedado já era protegido server-side (video-url / VPS /sign);
--    agora o YouTube passa pelo mesmo critério.
-- -------------------------------------------------------------
create table if not exists public.workout_media (
  workout_id uuid primary key references public.workouts(id) on delete cascade,
  youtube_id text,
  updated_at timestamptz not null default now()
);

alter table public.workout_media enable row level security;

drop policy if exists media_select_entitled on public.workout_media;
create policy media_select_entitled on public.workout_media
  for select using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.workouts w
      where w.id = workout_id
        and w.published = true
        and public.current_tier(auth.uid()) >= w.required_tier
    )
  );

drop policy if exists media_admin_write on public.workout_media;
create policy media_admin_write on public.workout_media
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Move o que já existir e mantém a coluna antiga sempre nula.
insert into public.workout_media (workout_id, youtube_id)
select id, youtube_id from public.workouts where youtube_id is not null
on conflict (workout_id) do update set youtube_id = excluded.youtube_id;

update public.workouts set youtube_id = null where youtube_id is not null;

-- Qualquer escrita futura em workouts.youtube_id (inclusive vinda do painel
-- antigo, ainda publicado) é desviada para a tabela protegida.
create or replace function public.capture_workout_youtube()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.youtube_id is not null then
    insert into public.workout_media (workout_id, youtube_id, updated_at)
    values (new.id, new.youtube_id, now())
    on conflict (workout_id)
      do update set youtube_id = excluded.youtube_id, updated_at = now();
    new.youtube_id := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_workouts_capture_youtube on public.workouts;
create trigger trg_workouts_capture_youtube
  before insert or update on public.workouts
  for each row execute function public.capture_workout_youtube();

-- Leitura do youtube_id pelo app: uma porta só, com o mesmo critério do vídeo.
create or replace function public.workout_youtube_id(p_workout_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.youtube_id
  from public.workout_media m
  join public.workouts w on w.id = m.workout_id
  where m.workout_id = p_workout_id
    and (
      public.is_admin(auth.uid())
      or (w.published = true and public.current_tier(auth.uid()) >= w.required_tier)
    );
$$;

revoke all on function public.workout_youtube_id(uuid) from public;
grant execute on function public.workout_youtube_id(uuid) to authenticated;
