// Conexão da conta Mercado Pago pelo painel da Mirian (OAuth).
//
// Três entradas, todas nesta função:
//   POST  { action: 'start' }       -> devolve a URL de autorização (admin)
//   GET   /callback?code&state      -> o Mercado Pago volta aqui (sem JWT)
//   POST  { action: 'disconnect' }  -> desfaz a conexão (admin)
//
// Deploy com verify_jwt = false: o callback é um redirect do navegador vindo do
// Mercado Pago e não carrega JWT nenhum. Quem exige admin é o código abaixo,
// nas ações que precisam.
//
// O token nunca passa pelo navegador. O que trafega é o `code`, de uso único e
// vida curta; quem troca por token é esta função, do lado do servidor.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsFor, jsonFor, preflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLIENT_ID = Deno.env.get('MP_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';

const MP = 'https://api.mercadopago.com';
const MP_AUTH = 'https://auth.mercadopago.com.br/authorization';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/mp-oauth/callback`;

/** Volta para o painel com um recado curto na querystring. */
function voltarAoPainel(resultado: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_URL}/admin/pagamentos?mp=${encodeURIComponent(resultado)}` },
  });
}

/** Confere que quem chamou está logado E é admin. */
async function exigirAdmin(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;

  const comoUsuario = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const {
    data: { user },
  } = await comoUsuario.auth.getUser();
  if (!user) return null;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: perfil } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return perfil?.role === 'admin' ? user : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);

  const url = new URL(req.url);
  const ehCallback = url.pathname.endsWith('/callback');
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ---------------- retorno do Mercado Pago ----------------
  if (ehCallback) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const erroMP = url.searchParams.get('error');

    if (erroMP) return voltarAoPainel(`erro:${erroMP}`);
    if (!code || !state) return voltarAoPainel('erro:resposta-incompleta');
    if (!CLIENT_ID || !CLIENT_SECRET) return voltarAoPainel('erro:app-nao-configurado');

    // O state prova que o fluxo começou no nosso painel. Consome de uma vez:
    // delete com returning garante que um replay não passa duas vezes.
    const { data: guardado } = await admin
      .from('mp_oauth_state')
      .delete()
      .eq('state', state)
      .select('created_by, created_at')
      .maybeSingle();

    if (!guardado) return voltarAoPainel('erro:state-invalido');

    const idade = Date.now() - new Date(guardado.created_at as string).getTime();
    if (idade > 30 * 60 * 1000) return voltarAoPainel('erro:state-expirado');

    const res = await fetch(`${MP}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      console.error('MP recusou a troca do code', res.status, (await res.text()).slice(0, 400));
      return voltarAoPainel('erro:troca-recusada');
    }

    const d = await res.json();

    // Quem é a conta que acabou de conectar — para o painel poder mostrar.
    let nickname: string | null = null;
    let email: string | null = null;
    try {
      const me = await fetch(`${MP}/users/me`, {
        headers: { Authorization: `Bearer ${d.access_token}` },
      });
      if (me.ok) {
        const perfil = await me.json();
        nickname = perfil.nickname ?? null;
        email = perfil.email ?? null;
      }
    } catch {
      /* identificação é enfeite; não impede a conexão */
    }

    const { error } = await admin.from('payment_connection').upsert(
      {
        id: true,
        provider: 'mercadopago',
        mp_user_id: d.user_id ? String(d.user_id) : null,
        nickname,
        email,
        access_token: d.access_token,
        refresh_token: d.refresh_token ?? null,
        public_key: d.public_key ?? null,
        live_mode: d.live_mode ?? null,
        expires_at: new Date(Date.now() + Number(d.expires_in ?? 0) * 1000).toISOString(),
        connected_by: guardado.created_by,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('falha ao guardar a conexão', error.message);
      return voltarAoPainel('erro:falha-ao-guardar');
    }

    await admin.rpc('purge_mp_oauth_state');
    return voltarAoPainel('conectado');
  }

  // ---------------- ações do painel ----------------
  try {
    const usuario = await exigirAdmin(req);
    if (!usuario) return jsonFor(req, { error: 'apenas administradores' }, 403);

    const { action } = await req.json().catch(() => ({ action: '' }));

    if (action === 'start') {
      if (!CLIENT_ID || !CLIENT_SECRET) {
        return jsonFor(req, { error: 'app_nao_configurado' }, 400);
      }

      const state = crypto.randomUUID();
      const { error } = await admin
        .from('mp_oauth_state')
        .insert({ state, created_by: usuario.id });
      if (error) return jsonFor(req, { error: error.message }, 500);

      const autorizar = new URL(MP_AUTH);
      autorizar.searchParams.set('client_id', CLIENT_ID);
      autorizar.searchParams.set('response_type', 'code');
      autorizar.searchParams.set('platform_id', 'mp');
      autorizar.searchParams.set('state', state);
      autorizar.searchParams.set('redirect_uri', REDIRECT_URI);

      return jsonFor(req, { url: autorizar.toString() });
    }

    if (action === 'disconnect') {
      // Some com o token. A assinatura de quem já assinou continua viva no
      // Mercado Pago — desconectar aqui só impede novas cobranças por esta conta.
      const { error } = await admin.from('payment_connection').delete().eq('id', true);
      if (error) return jsonFor(req, { error: error.message }, 500);
      return jsonFor(req, { ok: true });
    }

    return jsonFor(req, { error: 'ação desconhecida' }, 400);
  } catch (e) {
    return jsonFor(req, { error: String(e) }, 500);
  }
});
