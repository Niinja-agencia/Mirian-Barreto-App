// Recria as contas demo (admin, aluna e alunas fictícias) com assinaturas,
// pagamentos e progresso. Idempotente: pode rodar mais de uma vez.
//
// Uso (a partir da pasta app/):
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE=eyJ... node supabase/seed/demo-users.mjs
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE;
if (!URL || !SR) { console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE'); process.exit(1); }
const db = createClient(URL, SR, { auth: { persistSession: false } });

const ACCOUNTS = [
  { email: 'admin.demo@mirianbarreto.app', pass: 'Admin#Demo2026', name: 'Admin Demo (Mirian)', role: 'admin' },
  { email: 'aluna.demo@mirianbarreto.app', pass: 'Aluna#Demo2026', name: 'Aluna Demo', plan: 'premium', status: 'active', months: 2, method: 'credit_card', progress: 5 },
  { email: 'maria.oliveira@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Maria Oliveira', level: 'intermediario', plan: 'premium', status: 'active', months: 6, method: 'credit_card', progress: 9 },
  { email: 'ana.souza@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Ana Souza', level: 'iniciante', plan: 'basic', status: 'active', months: 2, method: 'pix', progress: 4 },
  { email: 'juliana.costa@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Juliana Costa', level: 'avancado', plan: 'vip', status: 'active', months: 10, method: 'credit_card', progress: 15 },
  { email: 'camila.santos@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Camila Santos', level: 'intermediario', plan: 'premium', status: 'active', months: 4, method: 'credit_card', progress: 7 },
  { email: 'fernanda.lima@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Fernanda Lima', level: 'iniciante', plan: 'basic', status: 'active', months: 1, method: 'pix', progress: 3 },
  { email: 'patricia.almeida@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Patrícia Almeida', level: 'intermediario', plan: 'premium', status: 'past_due', months: 8, method: 'credit_card', progress: 6 },
  { email: 'beatriz.rocha@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Beatriz Rocha', level: 'avancado', plan: 'vip', status: 'canceled', months: 12, method: 'credit_card', progress: 11 },
  { email: 'larissa.martins@alunasdemo.mirian.app', pass: 'AlunaDemo#2026', name: 'Larissa Martins', level: 'iniciante', progress: 0 },
];

const monthsAgo = (n) => new Date(Date.now() - n * 30 * 864e5).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

const { data: plans } = await db.from('plans').select('id, slug, price_monthly');
const planBy = Object.fromEntries((plans ?? []).map((p) => [p.slug, p]));
const { data: workouts } = await db.from('workouts').select('id').eq('published', true).order('sort_order');

for (const a of ACCOUNTS) {
  // 1. usuário (ignora se já existir)
  let userId;
  const { data: created, error } = await db.auth.admin.createUser({
    email: a.email, password: a.pass, email_confirm: true,
    user_metadata: { full_name: a.name },
  });
  if (created?.user) userId = created.user.id;
  else {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users?.find((u) => u.email === a.email)?.id;
    if (!userId) { console.log('FALHA', a.email, error?.message); continue; }
  }

  // 2. perfil
  await db.from('profiles').update({
    full_name: a.name,
    role: a.role ?? 'aluno',
    level: a.level ?? 'iniciante',
    created_at: monthsAgo(a.months ?? 0),
  }).eq('id', userId);

  // 3. assinatura + pagamento
  const plan = a.plan ? planBy[a.plan] : null;
  if (plan) {
    const { data: existing } = await db.from('subscriptions').select('id').eq('user_id', userId).limit(1);
    if (!existing?.length) {
      const end = a.status === 'past_due' ? daysAgo(3)
        : a.status === 'canceled' ? new Date(Date.now() + 12 * 864e5).toISOString()
        : new Date(Date.now() + 30 * 864e5).toISOString();
      await db.from('subscriptions').insert({
        user_id: userId, plan_id: plan.id, status: a.status, billing: 'monthly',
        current_period_start: monthsAgo(a.months), current_period_end: end,
        cancel_at_period_end: a.status === 'canceled',
        canceled_at: a.status === 'canceled' ? daysAgo(2) : null,
      });
      if (a.status !== 'past_due') {
        await db.from('payments').insert({
          user_id: userId, plan_id: plan.id, amount: plan.price_monthly,
          method: a.method, status: 'approved', paid_at: monthsAgo(a.months),
          description: `Assinatura ${a.plan}`, mp_payment_id: `demo-${a.email}-init`,
        });
      }
      if (a.status === 'active') {
        await db.from('payments').insert({
          user_id: userId, plan_id: plan.id, amount: plan.price_monthly,
          method: a.method, status: 'approved', paid_at: daysAgo(6),
          description: `Renovação ${a.plan}`, mp_payment_id: `demo-${a.email}-recent`,
        });
      }
    }
  }

  // 4. progresso
  if (a.progress > 0 && workouts?.length) {
    const rows = workouts.slice(0, a.progress).map((w, i) => ({
      user_id: userId, workout_id: w.id, completed_at: daysAgo(i + 1),
    }));
    await db.from('workout_progress').upsert(rows, { onConflict: 'user_id,workout_id' });
  }

  console.log('OK', a.email, a.role ?? 'aluno', a.plan ?? '(sem plano)');
}
console.log('\nContas demo recriadas.');
