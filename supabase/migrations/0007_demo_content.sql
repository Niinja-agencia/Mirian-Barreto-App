-- ===== Conteúdo demo: treinos (sem vídeo) =====
-- Versionado de propósito: permite restaurar o ambiente de demonstração
-- inteiro apenas reaplicando as migrações.

insert into public.workouts
  (category_id, title_pt, title_en, description_pt, description_en, level, duration_seconds, required_tier, published, sort_order)
select c.id, v.title_pt, v.title_en, v.desc_pt, v.desc_en, v.level::public.fitness_level, v.dur, v.tier, v.pub, v.ord
from (values
  ('full-body','Full Body Express 20','Full Body Express 20','Treino completo e rápido para ativar o corpo todo em 20 minutos.','A fast full-body workout to activate every muscle in 20 minutes.','iniciante',1200,1,true,1),
  ('full-body','Full Body Força','Full Body Strength','Circuito de força para o corpo inteiro com foco em resistência.','Strength circuit for the whole body focused on endurance.','intermediario',2400,2,true,2),
  ('full-body','Full Body HIIT Avançado','Advanced Full Body HIIT','Alta intensidade para quem já tem condicionamento e quer evoluir.','High intensity for those already conditioned and ready to level up.','avancado',1800,2,true,3),
  ('inferiores','Pernas e Glúteos Iniciante','Legs and Glutes Beginner','Base de pernas e glúteos para começar com segurança.','Legs and glutes foundation to start safely.','iniciante',1500,3,true,4),
  ('inferiores','Inferiores Pesado','Heavy Lower Body','Volume e carga para membros inferiores. Prepare-se.','Volume and load for the lower body. Get ready.','avancado',2700,3,true,5),
  ('superiores','Braços Definidos','Defined Arms','Tônus e definição para braços e ombros.','Tone and definition for arms and shoulders.','iniciante',1200,3,true,6),
  ('superiores','Costas e Ombros','Back and Shoulders','Postura e força para a parte superior do corpo.','Posture and strength for the upper body.','intermediario',1800,3,true,7),
  ('abdomen','Abdômen 10','Abs 10','Dez minutos diretos no core. Sem desculpas.','Ten minutes straight to the core. No excuses.','iniciante',600,3,true,8),
  ('abdomen','Core Power','Core Power','Estabilidade e força do centro do corpo.','Stability and strength from the body center.','intermediario',1500,3,true,9),
  ('abdomen','Abdômen Avançado','Advanced Abs','Desafio real para o core de quem já treina.','A real challenge for an already trained core.','avancado',1200,3,true,10),
  ('cardio','Cardio Dança','Dance Cardio','Queime calorias dançando, sem perceber o tempo passar.','Burn calories dancing and lose track of time.','iniciante',1800,3,true,11),
  ('cardio','HIIT Queima Total','Total Burn HIIT','Intervalos intensos para acelerar o metabolismo.','Intense intervals to boost your metabolism.','intermediario',1200,3,true,12),
  ('cardio','Cardio Intenso','Intense Cardio','Resistência cardiovascular no limite.','Cardiovascular endurance at the limit.','avancado',2100,3,true,13),
  ('mobilidade','Alongamento Matinal','Morning Stretch','Comece o dia soltando o corpo e a mente.','Start the day releasing body and mind.','iniciante',900,3,true,14),
  ('mobilidade','Mobilidade Total','Full Mobility','Ganhe amplitude e previna lesões.','Gain range of motion and prevent injuries.','iniciante',1200,3,true,15),
  ('gluteos','Desafio Glúteos 28 dias','28-Day Glutes Challenge','Programa progressivo para resultados visíveis em 28 dias.','Progressive program for visible results in 28 days.','intermediario',1500,3,true,16),
  ('gluteos','Glúteos em Foco','Glutes Focus','Isolamento e ativação para os glúteos.','Isolation and activation for the glutes.','intermediario',1800,3,true,17),
  ('hiit','HIIT 15','HIIT 15','Quinze minutos de alta intensidade para dias corridos.','Fifteen minutes of high intensity for busy days.','intermediario',900,3,true,18),
  ('yoga-pilates','Yoga Flow Relax','Yoga Flow Relax','Fluxo suave para relaxar e alongar.','A gentle flow to relax and stretch.','iniciante',1800,3,true,19),
  ('yoga-pilates','Pilates Core','Pilates Core','Controle, respiração e força do centro.','Control, breathing and core strength.','intermediario',2100,3,true,20),
  ('full-body','Full Body Premium (em breve)','Full Body Premium (coming soon)','Conteúdo novo chegando. Em produção.','New content arriving. In production.','intermediario',0,3,false,21),
  ('gluteos','Glúteos VIP (em breve)','Glutes VIP (coming soon)','Exclusivo para o plano VIP. Em breve.','Exclusive to the VIP plan. Coming soon.','avancado',0,3,false,22)
) as v(cat_slug, title_pt, title_en, desc_pt, desc_en, level, dur, tier, pub, ord)
join public.workout_categories c on c.slug = v.cat_slug
where not exists (select 1 from public.workouts w where w.title_pt = v.title_pt);
