// Inicia o pagamento no Mercado Pago.
//  - planos recorrentes + cartão -> preapproval (mensal ou anual) -> init_point
//  - avulso + cartão             -> pagamento único (Checkout Pro) -> init_point
//  - qualquer plano + pix        -> pagamento único -> QR code
// Cria registros 'pending'; a liberação ocorre no webhook.
//
// O período vem do corpo da requisição ('monthly' | 'annual'). Antes o campo
// era recebido e ignorado: o checkout cobrava sempre price_monthly, mesmo com
// a tela oferecendo plano anual.
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

    const { plan_slug, method, billing: billingIn } = await req.json();
    if (!plan_slug || !method) return json({ error: 'parâmetros faltando' }, 400);

    const billing: 'monthly' | 'annual' = billingIn === 'annual' ? 'annual' : 'monthly';

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: plan } = await admin.from('plans').select('*').eq('slug', plan_slug).maybeSingle();
    if (!plan) return json({ error: 'plano não encontrado' }, 404);

    const planName = plan.name_pt as string;
    const oneTime = plan.slug === 'avulso';

    // price_annual é o valor CHEIO de 12 meses. O seed deixou a coluna igual ao
    // mensal como marcador de "ainda não definido" — aceitar 'annual' nesse
    // estado venderia um ano pelo preço de um mês. A tela já esconde a opção,
    // mas a trava tem que estar aqui: o corpo da requisição vem do cliente.
    const mensal = Number(plan.price_monthly);
    const anual = Number(plan.price_annual);
    const anualDisponivel = Number.isFinite(anual) && anual > mensal;

    if (billing === 'annual' && !oneTime && !anualDisponivel) {
      return json({ error: 'plano anual não configurado' }, 400);
    }

    // Avulso é compra única: não existe "anual" para ele.
    const periodo: 'monthly' | 'annual' = oneTime ? 'monthly' : billing;
    const meses = periodo === 'annual' ? 12 : 1;
    const amount = periodo === 'annual' ? anual : mensal;
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'preço do plano não configurado' }, 400);
    }

    // ---------------- CARTÃO recorrente (planos mensais) ----------------
    if (method === 'credit_card' && !oneTime) {
      const { data: sub, error: subErr } = await admin
        .from('subscriptions')
        .insert({ user_id: user.id, plan_id: plan.id, status: 'pending', billing: periodo })
        .select('id')
        .single();
      if (subErr) return json({ error: subErr.message }, 500);

      const res = await fetch(`${MP}/preapproval`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `Mirian Barreto — Plano ${planName} (${periodo === 'annual' ? 'anual' : 'mensal'})`,
          external_reference: sub.id,
          payer_email: user.email,
          back_url: `${APP_URL}/app/assinatura`,
          // O MP só aceita 'months' e 'days' — anual é 12 meses.
          auto_recurring: {
            frequency: meses,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'BRL',
          },
          status: 'pending',
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'mp_error', detail: data }, 502);
      await admin.from('subscriptions').update({ mp_preapproval_id: data.id }).eq('id', sub.id);
      return json({ init_point: data.init_point ?? data.sandbox_init_point });
    }

    // ---------------- CARTÃO avulso (compra única — Checkout Pro) ----------------
    if (method === 'credit_card' && oneTime) {
      const { data: pay, error: payErr } = await admin
        .from('payments')
        .insert({ user_id: user.id, plan_id: plan.id, amount, method: 'credit_card', status: 'pending', description: `Avulso — ${planName}` })
        .select('id')
        .single();
      if (payErr) return json({ error: payErr.message }, 500);

      const res = await fetch(`${MP}/checkout/preferences`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ title: `Mirian Barreto — ${planName}`, quantity: 1, unit_price: amount, currency_id: 'BRL' }],
          payer: { email: user.email },
          external_reference: pay.id,
          back_urls: { success: `${APP_URL}/app`, pending: `${APP_URL}/app`, failure: `${APP_URL}/app/assinatura` },
          auto_return: 'approved',
          metadata: { plan_id: plan.id, billing: 'once', user_id: user.id },
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'mp_error', detail: data }, 502);
      return json({ init_point: data.init_point ?? data.sandbox_init_point });
    }

    // ---------------- PIX (compra única) ----------------
    if (method === 'pix') {
      const { data: pay, error: payErr } = await admin
        .from('payments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount,
          method: 'pix',
          status: 'pending',
          description: `Plano ${planName}${oneTime ? '' : periodo === 'annual' ? ' (anual)' : ' (mensal)'}`,
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
          // O webhook usa este metadata para saber quantos meses liberar.
          metadata: { plan_id: plan.id, billing: oneTime ? 'once' : periodo, user_id: user.id },
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'mp_error', detail: data }, 502);
      await admin.from('payments').update({ mp_payment_id: String(data.id) }).eq('id', pay.id);

      const tx = data.point_of_interaction?.transaction_data;
      return json({ pix: { qr_code: tx?.qr_code, qr_code_base64: tx?.qr_code_base64 }, payment_id: data.id });
    }

    return json({ error: 'método inválido' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
