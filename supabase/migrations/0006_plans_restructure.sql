-- ===== Reestruturação de planos (Avulso/Básico/Premium/VIP) =====
-- Tiers: avulso=1, basic=2, premium=3, vip=4

update public.plans set tier = 2 where slug = 'basic';
update public.plans set tier = 3 where slug = 'premium';
update public.plans set tier = 4 where slug = 'vip';

update public.plans set
  price_monthly = 39.90, price_annual = 39.90,
  features_pt = '["3 videoaulas","Treinos atualizados mensalmente","Suporte via comunidade"]'::jsonb,
  features_en = '["3 video classes","Monthly updated workouts","Community support"]'::jsonb
where slug = 'basic';

update public.plans set
  price_monthly = 69.90, price_annual = 69.90,
  highlighted = true,
  features_pt = '["Acesso a todos os treinos","Acompanhamento de progresso","Tire suas dúvidas direto com a Mirian","Download offline"]'::jsonb,
  features_en = '["Access to all workouts","Progress tracking","Ask Mirian your questions directly","Offline download"]'::jsonb
where slug = 'premium';

update public.plans set
  price_monthly = 99.90, price_annual = 99.90,
  highlighted = false,
  features_pt = '["Tudo do Premium","Consultoria nutricional mensal","1 videochamada mensal","Plano totalmente individualizado","Prioridade no suporte"]'::jsonb,
  features_en = '["Everything in Premium","Monthly nutrition consulting","1 monthly video call","Fully individualized plan","Priority support"]'::jsonb
where slug = 'vip';

-- Avulso (novo) — compra única
insert into public.plans (slug, tier, name_pt, name_en, description_pt, description_en,
                          price_monthly, price_annual, features_pt, features_en, highlighted, active, sort_order)
values ('avulso', 1, 'Avulso', 'Single', 'Experimente um treino', 'Try a single workout',
        19.90, 19.90,
        '["Apenas 1 treino / videoaula","Acesso imediato","Sem assinatura"]'::jsonb,
        '["Just 1 workout / video class","Instant access","No subscription"]'::jsonb,
        false, true, 0)
on conflict (slug) do update set
  tier = excluded.tier, price_monthly = excluded.price_monthly, price_annual = excluded.price_annual,
  name_pt = excluded.name_pt, name_en = excluded.name_en,
  description_pt = excluded.description_pt, description_en = excluded.description_en,
  features_pt = excluded.features_pt, features_en = excluded.features_en, sort_order = excluded.sort_order;

-- Acesso por tier: avulso vê 1 treino, básico vê 3, premium/vip veem todos
update public.workouts set required_tier = case
  when sort_order = 1 then 1
  when sort_order in (2, 3) then 2
  else 3
end;
