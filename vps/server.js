// Mirian Barreto — worker de vídeo (upload + conversão + entrega protegida)
//
// Fluxo:
//  1) Admin envia o vídeo bruto        -> POST /upload   (JWT de admin)
//  2) Worker converte com FFmpeg       -> /var/lib/mirian-videos/<workout_id>.mp4
//  3) Aluna pede o vídeo               -> POST /sign     (JWT da aluna, valida plano)
//  4) Player abre a URL assinada       -> GET /v/:file   -> X-Accel-Redirect (nginx serve)
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SIGNING_SECRET,
  VIDEO_DIR = '/var/lib/mirian-videos',
  TMP_DIR = '/var/lib/mirian-transcoder/tmp',
  PORT = 8791,
  PUBLIC_HOST = 'https://video.mirianbarreto.com.br',
} = process.env;

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE, SIGNING_SECRET })) {
  if (!v) { console.error(`Faltando env ${k}`); process.exit(1); }
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const app = express();
app.use(express.json());
// CORS (o site chama daqui)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'authorization, content-type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const upload = multer({ dest: TMP_DIR, limits: { fileSize: 8 * 1024 * 1024 * 1024 } }); // 8 GB
const jobs = new Map(); // jobId -> { status, workoutId, error }

// ---------- auth ----------
async function userFromRequest(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
async function requireAdmin(req, res, next) {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { data: prof } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (prof?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  req.user = user;
  next();
}

// ---------- assinatura de URL ----------
function sign(file, expires) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(`${file}.${expires}`).digest('base64url');
}

// ---------- conversão ----------
function transcode(input, output) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y', '-i', input,
      '-vf', 'scale=-2:1280:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      output,
    ];
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err = d.toString().slice(-500); });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || `ffmpeg exit ${code}`))));
  });
}

async function processJob(jobId, inputPath, workoutId) {
  const output = path.join(VIDEO_DIR, `${workoutId}.mp4`);
  try {
    await transcode(inputPath, output);
    await db.from('workouts').update({ video_path: `${workoutId}.mp4`, youtube_id: null }).eq('id', workoutId);
    jobs.set(jobId, { status: 'done', workoutId, size: fs.statSync(output).size });
    console.log(`[job ${jobId}] pronto -> ${output}`);
  } catch (e) {
    jobs.set(jobId, { status: 'error', workoutId, error: String(e.message || e) });
    console.error(`[job ${jobId}] erro:`, e.message);
  } finally {
    fs.rm(inputPath, { force: true }, () => {});
  }
}

// ---------- rotas ----------
app.get('/health', (_req, res) => res.json({ ok: true, videos: fs.readdirSync(VIDEO_DIR).length }));

// Admin envia o vídeo bruto
app.post('/upload', requireAdmin, upload.single('video'), async (req, res) => {
  const workoutId = req.body.workout_id;
  if (!workoutId || !req.file) return res.status(400).json({ error: 'workout_id e video obrigatorios' });
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: 'processing', workoutId });
  res.status(202).json({ job_id: jobId });
  processJob(jobId, req.file.path, workoutId); // segue em background
});

// Admin acompanha a conversão
app.get('/status/:jobId', requireAdmin, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job nao encontrado' });
  res.json(job);
});

// Aluna pede acesso: valida plano e devolve URL temporária
app.post('/sign', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { workout_id } = req.body || {};
  if (!workout_id) return res.status(400).json({ error: 'workout_id obrigatorio' });

  const { data: workout } = await db
    .from('workouts')
    .select('video_path, required_tier, published')
    .eq('id', workout_id)
    .maybeSingle();
  if (!workout?.video_path) return res.status(404).json({ error: 'treino sem video' });

  const { data: prof } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = prof?.role === 'admin';
  const { data: tier } = await db.rpc('current_tier', { uid: user.id });

  const entitled = isAdmin || (workout.published && (tier ?? 0) >= workout.required_tier);
  if (!entitled) return res.status(403).json({ error: 'forbidden' });

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 3; // 3h
  const file = workout.video_path;
  res.json({ url: `${PUBLIC_HOST}/v/${encodeURIComponent(file)}?e=${expires}&t=${sign(file, expires)}` });
});

// Entrega protegida (nginx serve via X-Accel-Redirect)
app.get('/v/:file', (req, res) => {
  const file = path.basename(req.params.file);
  const { e, t } = req.query;
  if (!e || !t) return res.status(403).send('missing signature');
  if (Number(e) < Math.floor(Date.now() / 1000)) return res.status(410).send('expired');

  const expected = sign(file, e);
  const ok = expected.length === String(t).length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(t)));
  if (!ok) return res.status(403).send('invalid signature');
  if (!fs.existsSync(path.join(VIDEO_DIR, file))) return res.status(404).send('not found');

  res.set('X-Accel-Redirect', `/_protected/${file}`);
  res.set('Content-Type', 'video/mp4');
  res.end();
});

app.listen(PORT, '127.0.0.1', () => console.log(`mirian-transcoder ouvindo em 127.0.0.1:${PORT}`));
