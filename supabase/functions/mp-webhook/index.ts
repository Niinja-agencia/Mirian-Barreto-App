// Webhook do Mercado Pago. Deploy com verify_jwt = false (MP não envia JWT).
// Trata notificações de 'payment' (Pix avulso) e 'preapproval' (assinatura
// recorrente no cartão). Confirma a assinatura HMAC e consulta o recurso no MP.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')!;
const MP = 'https://api.mercadopago.com';

async function validSignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET || !dataId) return false;
  const signature = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=', 2)));
  const ts = parts.ts;
  const received = parts.v1?.toLowerCase();
  if (!requestId || !/^\d+$/.test(ts ?? '') || !/^[0-9a-f]{64}$/.test(received ?? '')) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(MP_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const expected = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ received!.charCodeAt(i);
  return mismatch === 0;
}

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
    const dataId = String(
      url.searchParams.get('data.id') ??
      (body.data as { id?: string | number } | undefined)?.id ??
      url.searchParams.get('id') ??
      ''
    );

    if (!type || !dataId) return json({ ok: true, ignored: true });
    if (!await validSignature(req, dataId)) return json({ error: 'invalid signature' }, 401);

    // Eventos diferentes sobre o mesmo pagamento devem ser processados. O
    // registro de auditoria não bloqueia mudanças de pending para approved.
    const audit = async () => {
      const eventId = String(body.id ?? req.headers.get('x-request-id') ?? dataId);
      await admin.from('webhook_events').upsert({
        source: 'mercadopago', event_key: `${type}:${eventId}`, type, payload: body,
      }, { onConflict: 'source,event_key' });
    };

    // ---------------- Pagamento avulso (Pix) ----------------
    if (type === 'payment') {
      const res = await fetch(`${MP}/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!res.ok) return json({ error: 'mp_payment_unavailable' }, 502);
      const pay = await res.json();
      const externalRef = pay.external_reference as string | undefined;
      const status = pay.status as string; // approved | pending | rejected | ...
      if (!externalRef || !/^[0-9a-f-]{36}$/i.test(externalRef)) return json({ ok: true, ignored: true });
      if (pay.currency_id !== 'BRL') return json({ error: 'currency mismatch' }, 422);

      const mappedStatus =
        status === 'approved'
          ? 'approved'
          : status === 'rejected'
            ? 'rejected'
            : status === 'refunded'
              ? 'refunded'
              : status === 'cancelled' || status === 'canceled'
                ? 'canceled'
                : status === 'charged_back'
                  ? 'charged_back'
                : 'pending';

      const { data: payRow } = await admin.from('payments')
        .select('user_id')
        .eq('id', externalRef)
        .maybeSingle();
      if (!payRow) return json({ ok: true, ignored: true });
      const { data: accessCreated, error: applyError } = await admin.rpc('apply_mp_payment', {
        p_payment_id: externalRef,
        p_mp_payment_id: String(pay.id),
        p_amount: Number(pay.transaction_amount),
        p_status: mappedStatus,
        p_raw: pay,
      });
      if (applyError) return json({ error: applyError.message }, 500);
      if (accessCreated && payRow.user_id) {
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
      await audit();
      return json({ ok: true });
    }

    // ---------------- Assinatura recorrente (preapproval) ----------------
    if (type === 'preapproval' || type === 'subscription_preapproval') {
      const res = await fetch(`${MP}/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!res.ok) return json({ error: 'mp_subscription_unavailable' }, 502);
      const pre = await res.json();
      const externalRef = pre.external_reference as string | undefined; // subscriptions.id
      const status = pre.status as string; // authorized | paused | cancelled | pending
      if (!externalRef || !/^[0-9a-f-]{36}$/i.test(externalRef)) return json({ ok: true, ignored: true });

      const mapped =
        status === 'authorized'
          ? 'active'
          : status === 'cancelled' || status === 'canceled'
            ? 'canceled'
            : status === 'paused'
              ? 'past_due'
              : 'pending';

      // define período com base na frequência
      const freq = pre.auto_recurring?.frequency ?? 1;
      const { data: previous } = await admin.from('subscriptions')
        .select('status, current_period_start, current_period_end, cancel_at_period_end, agreed_amount')
        .eq('id', externalRef).maybeSingle();
      if (!previous) return json({ ok: true, ignored: true });
      if (status === 'authorized' && (pre.auto_recurring?.currency_id !== 'BRL'
          || !Number.isFinite(Number(pre.auto_recurring?.transaction_amount))
          || Number(pre.auto_recurring?.transaction_amount) <= 0
          || (previous.agreed_amount != null
            && Number(pre.auto_recurring?.transaction_amount) !== Number(previous.agreed_amount)))) {
        return json({ error: 'subscription amount or currency mismatch' }, 422);
      }
      const nextPayment = pre.next_payment_date && !Number.isNaN(Date.parse(pre.next_payment_date))
        ? new Date(pre.next_payment_date).toISOString() : null;
      const periodEnd = nextPayment ?? (
        previous.status === 'active' && previous.current_period_end
          ? previous.current_period_end : addMonths(new Date(), freq).toISOString()
      );

      const { error: updateError } = await admin
        .from('subscriptions')
        .update({
          status: mapped,
          mp_preapproval_id: String(pre.id),
          current_period_start: status === 'authorized'
            ? previous.current_period_start ?? new Date().toISOString() : previous.current_period_start,
          current_period_end: status === 'authorized' ? periodEnd : previous.current_period_end,
          canceled_at: mapped === 'canceled' ? new Date().toISOString() : null,
        })
        .eq('id', externalRef);
      if (updateError) return json({ error: updateError.message }, 500);

      if (status === 'authorized' && previous.status !== 'active') {
        await enqueueEmail(admin, pre.payer_email ?? '', 'welcome', { reason: pre.reason });
      }
      await audit();
      return json({ ok: true });
    }

    return json({ ok: true, ignored: type });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
