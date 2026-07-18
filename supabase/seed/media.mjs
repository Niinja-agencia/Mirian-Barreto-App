// Gera e envia as capas (thumbnails) dos treinos e os avatares dos perfis.
// Idempotente (usa x-upsert). Uso a partir da pasta app/:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node supabase/seed/media.mjs
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE;
if (!URL || !SR) { console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE'); process.exit(1); }
const db = createClient(URL, SR, { auth: { persistSession: false } });

const PALETTE = {
  'full-body': ['#E91E63', '#7A0E33'], inferiores: ['#7C3AED', '#2E1065'],
  superiores: ['#2563EB', '#0B1E4D'], abdomen: ['#0EA5A4', '#0A3D3C'],
  cardio: ['#F97316', '#7C2D12'], mobilidade: ['#16A34A', '#0B3D1E'],
  gluteos: ['#EC4899', '#831843'], hiit: ['#EF4444', '#1F0A0A'],
  'yoga-pilates': ['#6366F1', '#1E1B4B'], _default: ['#E91E63', '#0A0A0A'],
};
const LEVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };
const AVATAR_COLORS = ['#E91E63', '#7C3AED', '#2563EB', '#0EA5A4', '#F97316', '#16A34A', '#EC4899', '#EF4444', '#6366F1', '#0891B2'];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const initials = (n) => { const p = (n || '?').trim().split(/\s+/); return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase(); };
function wrap(t, max = 17) {
  const words = t.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    if (lines.length === 2) break;
  }
  if (cur && lines.length < 2) lines.push(cur);
  return lines.slice(0, 2);
}

async function upload(bucket, path, body, type) {
  const res = await fetch(`${URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SR}`, apikey: SR, 'Content-Type': type, 'x-upsert': 'true' },
    body,
  });
  return res.ok;
}

// ---- Capas dos treinos ----
const { data: workouts } = await db
  .from('workouts')
  .select('id, title_pt, duration_seconds, level, category:workout_categories(slug, name_pt)');

let okThumbs = 0;
for (const w of workouts ?? []) {
  const cat = w.category?.slug ?? '_default';
  const [c1, c2] = PALETTE[cat] ?? PALETTE._default;
  const lines = wrap(w.title_pt)
    .map((ln, i) => `<text x="64" y="${452 + i * 92}" font-family="Georgia, serif" font-size="80" font-weight="700" fill="#fff">${esc(ln)}</text>`)
    .join('');
  const dur = w.duration_seconds ? `${Math.round(w.duration_seconds / 60)} min` : 'Em breve';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="1060" cy="150" r="230" fill="#fff" opacity="0.07"/><circle cx="160" cy="640" r="170" fill="#000" opacity="0.10"/>
  <text x="64" y="92" font-family="Arial" font-size="26" letter-spacing="6" fill="#fff" opacity="0.85">${esc((w.category?.name_pt ?? '').toUpperCase())} · ${esc((LEVEL[w.level] ?? '').toUpperCase())}</text>
  <circle cx="640" cy="300" r="62" fill="#fff" opacity="0.92"/><path d="M623 268 L676 300 L623 332 Z" fill="#0A0A0A"/>
  ${lines}
  <text x="64" y="660" font-family="Arial" font-size="24" letter-spacing="4" fill="#fff" opacity="0.8">MIRIAN BARRETO</text>
  <text x="1216" y="660" text-anchor="end" font-family="Arial" font-size="28" font-weight="700" fill="#fff">${dur}</text>
</svg>`;
  if (await upload('thumbnails', `demo/${w.id}.svg`, svg, 'image/svg+xml')) {
    await db.from('workouts').update({ thumbnail_path: `demo/${w.id}.svg` }).eq('id', w.id);
    okThumbs++;
  }
}
console.log(`capas: ${okThumbs}/${workouts?.length ?? 0}`);

// ---- Avatares ----
const { data: profiles } = await db.from('profiles').select('id, full_name').order('created_at');
let okAv = 0;
for (let i = 0; i < (profiles?.length ?? 0); i++) {
  const p = profiles[i];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${AVATAR_COLORS[i % AVATAR_COLORS.length]}"/><text x="100" y="100" dy="0.35em" text-anchor="middle" font-family="Arial" font-size="86" font-weight="700" fill="#fff">${initials(p.full_name)}</text></svg>`;
  if (await upload('avatars', `demo/${p.id}.svg`, svg, 'image/svg+xml')) {
    await db.from('profiles').update({ avatar_url: `${URL}/storage/v1/object/public/avatars/demo/${p.id}.svg` }).eq('id', p.id);
    okAv++;
  }
}
console.log(`avatares: ${okAv}/${profiles?.length ?? 0}`);
