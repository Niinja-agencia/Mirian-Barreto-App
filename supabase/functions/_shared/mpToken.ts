// De onde sai o token que cobra as alunas.
//
// Ordem: a conta conectada pelo painel vence; o secret MP_ACCESS_TOKEN fica
// como retaguarda, para o app não parar de vender caso ninguém tenha conectado
// nada ainda.
//
// O token de OAuth do Mercado Pago dura 180 dias. Renovamos sozinhos quando
// falta menos de 7 dias — senão a cobrança quebraria em silêncio meio ano
// depois de conectar, que é o pior momento possível para descobrir.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const MP = 'https://api.mercadopago.com';
const MARGEM_RENOVACAO_MS = 7 * 24 * 60 * 60 * 1000;

export interface ContaMP {
  token: string;
  /** true quando veio da conta conectada pelo painel. */
  conectada: boolean;
  mpUserId?: string | null;
}

interface LinhaConexao {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  mp_user_id: string | null;
}

async function renovar(
  admin: SupabaseClient,
  linha: LinhaConexao
): Promise<string | null> {
  const clientId = Deno.env.get('MP_CLIENT_ID');
  const clientSecret = Deno.env.get('MP_CLIENT_SECRET');
  if (!clientId || !clientSecret || !linha.refresh_token) return null;

  const res = await fetch(`${MP}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: linha.refresh_token,
    }),
  });
  if (!res.ok) {
    console.error('MP recusou a renovação do token', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const d = await res.json();
  const expiraEm = new Date(Date.now() + Number(d.expires_in ?? 0) * 1000).toISOString();

  await admin
    .from('payment_connection')
    .update({
      access_token: d.access_token,
      refresh_token: d.refresh_token ?? linha.refresh_token,
      expires_at: expiraEm,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  return d.access_token as string;
}

/** O token a usar nas chamadas ao Mercado Pago. */
export async function contaMercadoPago(admin?: SupabaseClient): Promise<ContaMP> {
  const fallback = Deno.env.get('MP_ACCESS_TOKEN') ?? '';

  const db =
    admin ??
    createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

  const { data } = await db
    .from('payment_connection')
    .select('access_token, refresh_token, expires_at, mp_user_id')
    .eq('id', true)
    .maybeSingle();

  const linha = data as LinhaConexao | null;
  if (!linha?.access_token) return { token: fallback, conectada: false };

  const vence = linha.expires_at ? new Date(linha.expires_at).getTime() : 0;
  if (vence && vence - Date.now() < MARGEM_RENOVACAO_MS) {
    const novo = await renovar(db, linha);
    if (novo) return { token: novo, conectada: true, mpUserId: linha.mp_user_id };
    // Renovação falhou: segue com o token atual enquanto ele ainda valer.
  }

  return { token: linha.access_token, conectada: true, mpUserId: linha.mp_user_id };
}
