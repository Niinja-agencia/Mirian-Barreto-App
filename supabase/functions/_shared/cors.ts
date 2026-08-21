// CORS restrito à origem do app. Antes era '*', o que deixava qualquer site
// chamar as funções com o token da aluna que estivesse logada.
// Defina APP_URL nos secrets; EXTRA_ORIGINS aceita uma lista separada por vírgula
// (útil para previews da Vercel).
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';
const EXTRA = (Deno.env.get('EXTRA_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED = new Set([APP_URL, 'http://localhost:3000', ...EXTRA]);

function allowOrigin(origin: string | null): string {
  if (origin && ALLOWED.has(origin)) return origin;
  return APP_URL;
}

export function corsFor(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowOrigin(req.headers.get('Origin')),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    Vary: 'Origin',
  };
}

/** Resposta para o preflight. */
export function preflight(req: Request): Response {
  return new Response('ok', { headers: corsFor(req) });
}

export function jsonFor(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), 'Content-Type': 'application/json' },
  });
}

// --- Compatibilidade com as chamadas antigas ---------------------------------
// Mantidas para não quebrar import existente; preferir corsFor/jsonFor.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  Vary: 'Origin',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
