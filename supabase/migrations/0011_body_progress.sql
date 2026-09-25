-- Acompanhamento físico registrado pela aluna e consultado pela administração.
create table if not exists public.body_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric(6,2) check (weight_kg > 0 and weight_kg < 500),
  waist_cm numeric(6,2) check (waist_cm > 0 and waist_cm < 500),
  hip_cm numeric(6,2) check (hip_cm > 0 and hip_cm < 500),
  thigh_cm numeric(6,2) check (thigh_cm > 0 and thigh_cm < 500),
  photo_path text,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint body_progress_has_data check (
    weight_kg is not null or waist_cm is not null or hip_cm is not null
    or thigh_cm is not null or photo_path is not null
  )
);
create index if not exists idx_body_progress_user_date
  on public.body_progress(user_id, recorded_on desc, created_at desc);

alter table public.body_progress enable row level security;
grant select, insert, delete on public.body_progress to authenticated;

create policy body_progress_read on public.body_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));
create policy body_progress_add on public.body_progress
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (photo_path is null or photo_path like (select auth.uid())::text || '/%')
  );
create policy body_progress_remove on public.body_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- Fotos de evolução são privadas; a aluna e a administradora podem gerar URLs
-- temporárias apenas dos arquivos que sua política permite consultar.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy progress_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or public.is_admin((select auth.uid())))
  );
create policy progress_photos_add on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy progress_photos_remove on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
