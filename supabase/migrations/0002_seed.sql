-- =============================================================
-- Seed: planos (preços vindos da landing) + categorias iniciais
-- =============================================================

insert into public.plans (slug, tier, name_pt, name_en, description_pt, description_en,
                           price_monthly, price_annual, features_pt, features_en, highlighted, sort_order)
values
  ('basic', 1, 'Básico', 'Basic', 'Perfeito para começar', 'Perfect to get started',
    29.00, 279.00,
    '["Acesso a 100+ videoaulas","Treinos atualizados mensalmente","Suporte via comunidade"]'::jsonb,
    '["Access to 100+ video classes","Monthly updated workouts","Community support"]'::jsonb,
    false, 1),
  ('premium', 2, 'Premium', 'Premium', 'O favorito das alunas', 'The students'' favorite',
    59.00, 567.00,
    '["Acesso ilimitado a todas as videoaulas","Treinos personalizados","Acompanhamento de progresso","Suporte direto com a Mirian","Download offline"]'::jsonb,
    '["Unlimited access to all video classes","Personalized workouts","Progress tracking","Direct support from Mirian","Offline download"]'::jsonb,
    true, 2),
  ('vip', 3, 'VIP', 'VIP', 'Para resultados acelerados', 'For accelerated results',
    99.00, 950.00,
    '["Tudo do Premium","Consultoria nutricional mensal","Videochamada trimestral","Plano totalmente individualizado","Prioridade no suporte"]'::jsonb,
    '["Everything in Premium","Monthly nutrition consulting","Quarterly video call","Fully individualized plan","Priority support"]'::jsonb,
    false, 3)
on conflict (slug) do nothing;

insert into public.workout_categories (slug, name_pt, name_en, sort_order)
values
  ('full-body',     'Corpo Inteiro',  'Full Body',     1),
  ('inferiores',    'Membros Inferiores', 'Lower Body', 2),
  ('superiores',    'Membros Superiores', 'Upper Body', 3),
  ('abdomen',       'Abdômen e Core', 'Abs & Core',     4),
  ('cardio',        'Cardio',         'Cardio',         5),
  ('mobilidade',    'Mobilidade e Alongamento', 'Mobility & Stretching', 6)
on conflict (slug) do nothing;
