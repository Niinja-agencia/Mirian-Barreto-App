// Webhook do Mercado Pago. Deploy com verify_jwt = false (MP não envia JWT).
// Trata 'payment' (Pix/avulso), 'preapproval' (contratação da recorrência) e
// 'subscription_authorized_payment' (as cobranças mensais seguintes).
//
// Segurança: valida o HMAC do header 'x-signature' antes de qualquer coisa.
// Idempotência: a marca em webhook_events é removida se o processamento falhar,
// para que a retentativa do MP consiga reprocessar.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
const MP = 'https://api.mercadopago.com';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Comparação de tempo constante para evitar vazamento por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Valida o header x-signature do Mercado Pago.
 * Formato: "ts=1704908010,v1=<hmac_sha256>"
 * Manifesto assinado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
async function validSignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) return false; // sem segredo configurado → recusa (fail-closed)

  const sig = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';

  const parts = Object.fromEntries(
    sig.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    })
  ) as Record<string, string>;

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // Rejeita notificações antigas (proteção contra replay) — 10 min de tolerância.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 600) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return safeEqual(hex, v1.toLowerCase());
}

async function enqueueEmail(
  admin: ReturnType<typeof createClient>,
  to: string,
  template: string,
  payload: unknown
) {
  if (!to) return;
  await admin.from('email_outbox').insert({ to_email: to, template, payload });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let eventKey: string | null = null;

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

    // ---- assinatura do MP (antes de tocar em qualquer dado) ----
    if (!(await validSignature(req, String(dataId)))) {
      return json({ error: 'assinatura invalida' }, 401);
    }

    eventKey = `${type}:${dataId}`;

    // Idempotência: reserva o evento. Se outro processo já reservou, sai.
    const { error: dupErr } = await admin
      .from('webhook_events')
      .insert({ source: 'mercadopago', event_key: eventKey, type, payload: body });
    if (dupErr) return json({ ok: true, duplicate: true });

    // ---------------- Pagamento avulso (Pix / Checkout Pro) ----------------
    if (type === 'payment') {
      const res = await fetch(`${MP}/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!res.ok) throw new Error(`MP /v1/payments respondeu ${res.status}`);
      const pay = await res.json();
      const externalRef = pay.external_reference as string | undefined;
      const status = pay.status as string;

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

      if (status === 'approved' && payRow?.plan_id && payRow.user_id) {
        const billing = (pay.metadata?.billing as string) ?? 'monthly';
        const oneTime = billing === 'once';
        const months = billing === 'annual' ? 12 : 1;
        // Pix é sempre avulso: a linha nasce com o período contratado e não
        // renova sozinha — o lembrete de renovação é quem avisa a aluna.
        const periodEnd = oneTime ? null : addMonths(new Date(), months).toISOString();

        await admin.from('subscriptions').insert({
          user_id: payRow.user_id,
          plan_id: payRow.plan_id,
          status: 'active',
          billing: oneTime ? 'monthly' : (billing as 'monthly' | 'annual'),
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

    // ---------------- Contratação da recorrência (preapproval) ----------------
    if (type === 'preapproval' || type === 'subscription_preapproval') {
      const res = await fetch(`${MP}/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!res.ok) throw new Error(`MP /preapproval respondeu ${res.status}`);
      const pre = await res.json();
      const externalRef = pre.external_reference as string | undefined; // subscriptions.id
      const status = pre.status as string;

      const mapped =
        status === 'authorized'
          ? 'active'
          : status === 'cancelled'
            ? 'canceled'
            : status === 'paused'
              ? 'past_due'
              : 'pending';

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

    // -------- Cobrança mensal da recorrência (renovação) --------
    // Sem isto o current_period_end nunca era estendido: a aluna pagava o
    // segundo mês e perdia o acesso na virada do período.
    if (type === 'subscription_authorized_payment') {
      const res = await fetch(`${MP}/authorized_payments/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!res.ok) throw new Error(`MP /authorized_payments respondeu ${res.status}`);
      const ap = await res.json();

      const preapprovalId = String(ap.preapproval_id ?? '');
      const payStatus = ap.payment?.status ?? ap.status;
      if (!preapprovalId) return json({ ok: true, ignored: 'sem preapproval_id' });

      const { data: sub } = await admin
        .from('subscriptions')
        .select('id, user_id, current_period_end, plan_id, billing')
        .eq('mp_preapproval_id', preapprovalId)
        .maybeSingle();

      if (!sub) return json({ ok: true, ignored: 'assinatura desconhecida' });

      if (payStatus === 'approved' || payStatus === 'accredited') {
        // Estende a partir do fim do período vigente (não da data de hoje),
        // para não encurtar o acesso de quem paga adiantado.
        const base =
          sub.current_period_end && new Date(sub.current_period_end) > new Date()
            ? new Date(sub.current_period_end)
            : new Date();

        // Estende pelo período contratado. Estava fixo em 1 mês: quem pagasse
        // o plano anual perdia o acesso 30 dias depois de pagar por 12 meses.
        const mesesDoPlano = sub.billing === 'annual' ? 12 : 1;

        await admin
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: addMonths(base, mesesDoPlano).toISOString(),
          })
          .eq('id', sub.id);

        await admin.from('payments').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          plan_id: sub.plan_id,
          amount: ap.transaction_amount ?? 0,
          method: 'credit_card',
          status: 'approved',
          mp_payment_id: ap.payment?.id ? String(ap.payment.id) : null,
          description: 'Renovação da assinatura',
          raw: ap,
          paid_at: new Date().toISOString(),
        });
      } else if (payStatus === 'rejected' || payStatus === 'cancelled') {
        await admin.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id);

        const { data: u } = await admin.auth.admin.getUserById(sub.user_id);
        const { data: prof } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', sub.user_id)
          .maybeSingle();
        await enqueueEmail(admin, u.user?.email ?? '', 'payment_failed', {
          name: prof?.full_name,
        });
      }
      return json({ ok: true });
    }

    return json({ ok: true, ignored: type });
  } catch (e) {
    // Libera a marca de idempotência para que a retentativa do MP reprocesse.
    // Sem isto, um erro transitório fazia o pagamento ser perdido para sempre.
    if (eventKey) {
      await admin
        .from('webhook_events')
        .delete()
        .eq('source', 'mercadopago')
        .eq('event_key', eventKey);
    }
    return json({ error: String(e) }, 500);
  }
});
