// Cancela a assinatura: cancela o preapproval no Mercado Pago (para a cobrança)
// e marca cancel_at_period_end. O acesso continua até current_period_end.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP = 'https://api.mercadopago.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { subscription_id } = await req.json();
    if (!subscription_id) return json({ error: 'subscription_id obrigatório' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, user_id, mp_preapproval_id')
      .eq('id', subscription_id)
      .maybeSingle();

    if (!sub) return json({ error: 'assinatura não encontrada' }, 404);
    if (sub.user_id !== user.id) return json({ error: 'forbidden' }, 403);

    // Cancela a cobrança recorrente no MP (se houver)
    if (sub.mp_preapproval_id) {
      await fetch(`${MP}/preapproval/${sub.mp_preapproval_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }

    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() })
      .eq('id', sub.id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
