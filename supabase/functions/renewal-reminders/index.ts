// Enfileira lembretes de renovação para assinaturas que vencem em ~3 dias
// e ainda não foram canceladas. Rode 1x/dia via agendamento.
// Proteja com header 'x-cron-secret' == CRON_SECRET (deploy verify_jwt=false).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'forbidden' }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const now = new Date();
  const in3 = new Date(now.getTime() + 3 * 24 * 3600 * 1000);

  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, current_period_end, cancel_at_period_end, plan:plans(name_pt), profile:profiles(full_name, id)')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', in3.toISOString());

  let queued = 0;
  for (const s of (subs ?? []) as unknown as Array<{
    current_period_end: string;
    plan: { name_pt: string } | null;
    profile: { full_name: string | null; id: string } | null;
  }>) {
    if (!s.profile) continue;
    // busca o e-mail do usuário via Auth admin
    const { data: u } = await admin.auth.admin.getUserById(s.profile.id);
    const email = u.user?.email;
    if (!email) continue;

    await admin.from('email_outbox').insert({
      to_email: email,
      template: 'renewal_reminder',
      payload: {
        name: s.profile.full_name,
        plan: s.plan?.name_pt,
        date: new Date(s.current_period_end).toLocaleDateString('pt-BR'),
      },
    });
    queued++;
  }

  return json({ ok: true, queued });
});
