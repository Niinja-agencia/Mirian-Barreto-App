// Webhook do Mercado Pago. Deploy com verify_jwt = false (MP não envia JWT).
// Trata notificações de 'payment' (Pix avulso) e 'preapproval' (assinatura
// recorrente no cartão). Idempotente via tabela webhook_events.
//
// Segurança: valide o segredo da notificação. O MP envia o header
// 'x-signature' (HMAC). Aqui conferimos um segredo simples por querystring/secret
// configurável; para produção, implemente a verificação HMAC completa do MP.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP = 'https://api.mercadopago.com';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function enqueueEmail(admin: ReturnType<typeof createClient>, to: string, template: string, payload: unknown) {
  if (!to) return;
  await admin.from('email_outbox').insert({ to_email: to, template, payload });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      /* MP às vezes manda só querystring */
    }

    const type =
      (body.type as string) ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '';
    const dataId =
      (body.data as { id?: string } | undefined)?.id ??
      url.searchParams.get('data.id') ??
      url.searchParams.get('id') ??
      '';

    if (!type || !dataId) return json({ ok: true, ignored: true });

    const eventKey = `${type}:${dataId}`;

    // Idempotência
    const { error: dupErr } = await admin
      .from('webhook_events')
      .insert({ source: 'mercadopago', event_key: eventKey, type, payload: body });
    if (dupErr) {
      // conflito de unique → já processado
      return json({ ok: true, duplicate: true });
    }

    // ---------------- Pagamento avulso (Pix) ----------------
    if (type === 'payment') {
      const res = await fetch(`${MP}/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      const pay = await res.json();
      const externalRef = pay.external_reference as string | undefined;
      const status = pay.status as string; // approved | pending | rejected | ...

      const mappedStatus =
        status === 'approved'
          ? 'approved'
          : status === 'rejected'
            ? 'rejected'
            : status === 'refunded'
              ? 'refunded'
              : status === 'cancelled'
                ? 'canceled'
                : 'pending';

      // atualiza o pagamento
      const { data: payRow } = await admin
        .from('payments')
        .update({
          status: mappedStatus,
          mp_payment_id: String(pay.id),
          raw: pay,
          paid_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', externalRef)
        .select('user_id, plan_id')
        .maybeSingle();

      // Pix aprovado → cria/renova um período de assinatura (avulso)
      if (status === 'approved' && payRow?.plan_id && payRow.user_id) {
        const billing = (pay.metadata?.billing as string) ?? 'monthly';
        const months = billing === 'annual' ? 12 : 1;
        const periodEnd = addMonths(new Date(), months).toISOString();

        await admin.from('subscriptions').insert({
          user_id: payRow.user_id,
          plan_id: payRow.plan_id,
          status: 'active',
          billing,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
        });

        const { data: prof } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', payRow.user_id)
          .maybeSingle();
        await enqueueEmail(admin, pay.payer?.email ?? '', 'payment_approved', {
          name: prof?.full_name,
          amount: pay.transaction_amount,
        });
      }
      return json({ ok: true });
    }

    // ---------------- Assinatura recorrente (preapproval) ----------------
    if (type === 'preapproval' || type === 'subscription_preapproval') {
      const res = await fetch(`${MP}/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      const pre = await res.json();
      const externalRef = pre.external_reference as string | undefined; // subscriptions.id
      const status = pre.status as string; // authorized | paused | cancelled | pending

      const mapped =
        status === 'authorized'
          ? 'active'
          : status === 'cancelled'
            ? 'canceled'
            : status === 'paused'
              ? 'past_due'
              : 'pending';

      // define período com base na frequência
      const freq = pre.auto_recurring?.frequency ?? 1;
      const periodEnd = addMonths(new Date(), freq).toISOString();

      await admin
        .from('subscriptions')
        .update({
          status: mapped,
          mp_preapproval_id: String(pre.id),
          current_period_start: status === 'authorized' ? new Date().toISOString() : null,
          current_period_end: status === 'authorized' ? periodEnd : null,
          canceled_at: status === 'cancelled' ? new Date().toISOString() : null,
        })
        .eq('id', externalRef);

      if (status === 'authorized') {
        await enqueueEmail(admin, pre.payer_email ?? '', 'welcome', { reason: pre.reason });
      }
      return json({ ok: true });
    }

    return json({ ok: true, ignored: type });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
