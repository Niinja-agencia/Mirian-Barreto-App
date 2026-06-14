// Inicia o pagamento no Mercado Pago.
//  - cartão  -> assinatura recorrente (preapproval) -> retorna init_point (redirect)
//  - pix     -> pagamento avulso -> retorna QR code (copia e cola + base64)
// Cria uma assinatura/pagamento 'pending'; a liberação ocorre no webhook.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';

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

    const { plan_slug, billing, method } = await req.json();
    if (!plan_slug || !billing || !method) return json({ error: 'parâmetros faltando' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: plan } = await admin
      .from('plans')
      .select('*')
      .eq('slug', plan_slug)
      .maybeSingle();
    if (!plan) return json({ error: 'plano não encontrado' }, 404);

    const amount = billing === 'annual' ? Number(plan.price_annual) : Number(plan.price_monthly);
    const planName = plan.name_pt as string;

    // ---------------- CARTÃO: assinatura recorrente ----------------
    if (method === 'credit_card') {
      // cria a assinatura pendente (external_reference)
      const { data: sub, error: subErr } = await admin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'pending',
          billing,
        })
        .select('id')
        .single();
      if (subErr) return json({ error: subErr.message }, 500);

      const body = {
        reason: `Mirian Barreto — Plano ${planName} (${billing === 'annual' ? 'anual' : 'mensal'})`,
        external_reference: sub.id,
        payer_email: user.email,
        back_url: `${APP_URL}/app/assinatura`,
        auto_recurring: {
          frequency: billing === 'annual' ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'BRL',
        },
        status: 'pending',
      };

      const res = await fetch(`${MP}/preapproval`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'mp_error', detail: data }, 502);

      await admin.from('subscriptions').update({ mp_preapproval_id: data.id }).eq('id', sub.id);
      return json({ init_point: data.init_point ?? data.sandbox_init_point });
    }

    // ---------------- PIX: cobrança avulsa ----------------
    if (method === 'pix') {
      const { data: pay, error: payErr } = await admin
        .from('payments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount,
          method: 'pix',
          status: 'pending',
          description: `Plano ${planName} (${billing})`,
        })
        .select('id')
        .single();
      if (payErr) return json({ error: payErr.message }, 500);

      const res = await fetch(`${MP}/v1/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': pay.id,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Mirian Barreto — Plano ${planName}`,
          payment_method_id: 'pix',
          external_reference: pay.id,
          payer: { email: user.email },
          metadata: { plan_id: plan.id, billing, user_id: user.id },
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'mp_error', detail: data }, 502);

      await admin.from('payments').update({ mp_payment_id: String(data.id) }).eq('id', pay.id);

      const tx = data.point_of_interaction?.transaction_data;
      return json({
        pix: { qr_code: tx?.qr_code, qr_code_base64: tx?.qr_code_base64 },
        payment_id: data.id,
      });
    }

    return json({ error: 'método inválido' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
