-- Suporte a vídeo do YouTube nos treinos (além do upload de arquivo no Storage).
alter table public.workouts add column if not exists youtube_id text;

-- Demo: inclui os dois vídeos do YouTube em todas as aulas, alternados.
update public.workouts
set youtube_id = case when (sort_order % 2) = 1 then 'E9zWYDDq7Kg' else 'mlsQESCwVW4' end;
