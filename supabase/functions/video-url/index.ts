// Gera uma URL assinada de curta duração para o vídeo de um treino,
// SOMENTE se a aluna tiver assinatura ativa cujo tier cobre o treino.
// O bucket 'workout-videos' é privado — esta é a única porta de entrada.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SIGNED_URL_TTL = 60 * 60; // 1h

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    // Identifica a aluna pelo JWT
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { workout_id } = await req.json();
    if (!workout_id) return json({ error: 'workout_id obrigatório' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: workout } = await admin
      .from('workouts')
      .select('video_path, required_tier, published')
      .eq('id', workout_id)
      .maybeSingle();

    if (!workout || !workout.video_path) return json({ error: 'treino sem vídeo' }, 404);

    // Verifica papel e tier
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';
    const { data: tier } = await admin.rpc('current_tier', { uid: user.id });

    const entitled = isAdmin || (workout.published && (tier ?? 0) >= workout.required_tier);
    if (!entitled) return json({ error: 'forbidden' }, 403);

    const { data: signed, error } = await admin.storage
      .from('workout-videos')
      .createSignedUrl(workout.video_path, SIGNED_URL_TTL);

    if (error || !signed) return json({ error: 'falha ao assinar URL' }, 500);

    return json({ url: signed.signedUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
