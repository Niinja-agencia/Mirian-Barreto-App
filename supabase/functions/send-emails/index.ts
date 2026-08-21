// Worker de e-mails transacionais. Drena a fila public.email_outbox e envia
// via Resend. Pensado para rodar por agendamento (pg_cron / Supabase Schedules).
// Proteja com header 'x-cron-secret' == CRON_SECRET (deploy com verify_jwt=false).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Mirian Barreto <contato@example.com>';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';

interface Tpl {
  subject: string;
  html: string;
}

/**
 * Escapa texto vindo do usuário antes de entrar no HTML do e-mail.
 * O full_name é preenchido no cadastro; sem isto dava para injetar link de
 * phishing num e-mail saindo do domínio da Mirian.
 */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(template: string, p: Record<string, unknown>): Tpl {
  const name = esc(p.name ?? 'aluna');
  const wrap = (inner: string) =>
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0A0A0A">
       ${inner}
       <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
       <p style="font-size:12px;color:#6B7280">Mirian Barreto — App de Treinos</p>
     </div>`;

  switch (template) {
    case 'welcome':
      return {
        subject: 'Bem-vinda ao app da Mirian! 💪',
        html: wrap(
          `<h2>Bem-vinda, ${name}!</h2>
           <p>Sua assinatura está ativa. Já pode acessar seus treinos.</p>
           <p><a href="${APP_URL}/app" style="background:#E91E63;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Acessar meus treinos</a></p>`
        ),
      };
    case 'payment_approved':
      return {
        subject: 'Pagamento confirmado ✅',
        html: wrap(
          `<h2>Pagamento confirmado!</h2>
           <p>Recebemos seu pagamento${p.amount ? ` de R$ ${esc(p.amount)}` : ''}. Acesso liberado.</p>
           <p><a href="${APP_URL}/app">Ir para o app</a></p>`
        ),
      };
    case 'renewal_reminder':
      return {
        subject: 'Sua assinatura vai renovar em breve',
        html: wrap(
          `<h2>Olá, ${name}!</h2>
           <p>Sua assinatura ${p.plan ? `(${esc(p.plan)}) ` : ''}renova em ${esc(p.date ?? 'breve')}.</p>
           <p>Se quiser ajustar ou cancelar, acesse <a href="${APP_URL}/app/assinatura">sua assinatura</a>.</p>`
        ),
      };
    case 'payment_failed':
      return {
        subject: 'Não conseguimos processar seu pagamento',
        html: wrap(
          `<h2>Ops, ${name}</h2>
           <p>Houve uma falha na cobrança da sua assinatura. Atualize seus dados para não perder o acesso.</p>
           <p><a href="${APP_URL}/app/assinatura">Resolver agora</a></p>`
        ),
      };
    default:
      return { subject: 'Mirian Barreto', html: wrap(`<p>Olá, ${name}.</p>`) };
  }
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'forbidden' }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: pending } = await admin
    .from('email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('created_at')
    .limit(50);

  let sent = 0;
  let failed = 0;

  for (const mail of pending ?? []) {
    const tpl = render(mail.template as string, (mail.payload as Record<string, unknown>) ?? {});
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: mail.to_email,
          subject: tpl.subject,
          html: tpl.html,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await admin
        .from('email_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', mail.id);
      sent++;
    } catch (e) {
      await admin
        .from('email_outbox')
        .update({
          status: (mail.attempts as number) >= 4 ? 'failed' : 'pending',
          attempts: (mail.attempts as number) + 1,
          error: String(e),
          scheduled_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .eq('id', mail.id);
      failed++;
    }
  }

  return json({ ok: true, sent, failed });
});
