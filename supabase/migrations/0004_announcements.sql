-- ===== Avisos / Comunicados da Mirian (mural da área de membros) =====
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title_pt    text not null,
  title_en    text not null,
  body_pt     text,
  body_en     text,
  pinned      boolean not null default false,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists ann_select on public.announcements;
create policy ann_select on public.announcements
  for select using (
    (published = true and auth.uid() is not null) or public.is_admin(auth.uid())
  );

drop policy if exists ann_admin_write on public.announcements;
create policy ann_admin_write on public.announcements
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- seed
insert into public.announcements (title_pt, title_en, body_pt, body_en, pinned, published) values
  ('Bem-vinda à plataforma! 💪', 'Welcome to the platform! 💪',
   'Aqui você encontra todos os seus treinos em vídeo, organizados por categoria e nível. Treine no seu ritmo e acompanhe sua evolução.',
   'Here you will find all your video workouts, organized by category and level. Train at your own pace and track your progress.',
   true, true),
  ('Novos treinos de Glúteos no ar', 'New Glutes workouts are live',
   'Acabei de adicionar uma série focada em glúteos. Corre conferir na categoria Glúteos!',
   'I just added a glutes-focused series. Go check it out in the Glutes category!',
   false, true),
  ('Desafio 28 dias começa segunda', '28-day challenge starts Monday',
   'Bora juntas? O Desafio Glúteos 28 dias começa na próxima segunda. Marque na agenda!',
   'Shall we do it together? The 28-day Glutes Challenge starts next Monday. Mark your calendar!',
   false, true),
  ('Dica da semana: hidratação', 'Tip of the week: hydration',
   'Lembre de beber água antes, durante e depois do treino. Pequenos hábitos, grandes resultados.',
   'Remember to drink water before, during and after your workout. Small habits, big results.',
   false, true);
