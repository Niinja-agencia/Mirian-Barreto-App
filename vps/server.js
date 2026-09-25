// Mirian Barreto — worker de vídeo (upload + conversão + entrega protegida)
//
// Fluxo:
//  1) Admin envia o vídeo em partes    -> /upload/init, /upload/:id/chunk, /upload/:id/finish
//  2) Worker converte com FFmpeg       -> /var/lib/mirian-videos/<workout_id>.mp4
//  3) Aluna pede o vídeo               -> POST /sign     (JWT da aluna, valida plano)
//  4) Player abre a URL assinada       -> GET /v/:file   -> X-Accel-Redirect (nginx serve)
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
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
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 * 1024;
const MAX_CHUNK_BYTES = 32 * 1024 * 1024;
const UPLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const inFlightUploads = new Set();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function uploadPaths(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return {
    part: path.join(TMP_DIR, `${id}.part`),
    meta: path.join(TMP_DIR, `${id}.json`),
  };
}

function readUpload(id) {
  const paths = uploadPaths(id);
  if (!paths || !fs.existsSync(paths.meta)) return null;
  try {
    return { ...JSON.parse(fs.readFileSync(paths.meta, 'utf8')), paths };
  } catch {
    return null;
  }
}

function writeUpload(upload) {
  const { paths, ...meta } = upload;
  meta.updatedAt = Date.now();
  fs.writeFileSync(`${paths.meta}.tmp`, JSON.stringify(meta));
  fs.renameSync(`${paths.meta}.tmp`, paths.meta);
}

function cleanupStaleUploads() {
  for (const name of fs.readdirSync(TMP_DIR).filter((file) => /^[0-9a-f-]{36}\.json$/i.test(file))) {
    const id = name.slice(0, -5);
    const upload = readUpload(id);
    if (upload?.status !== 'uploading' || inFlightUploads.has(id)) continue;
    if (Date.now() - upload.updatedAt > UPLOAD_TTL_MS) {
      fs.rmSync(upload.paths.part, { force: true });
      fs.rmSync(upload.paths.meta, { force: true });
    }
  }
}

const app = express();
app.use(express.json());
// CORS (o site chama daqui)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'authorization, content-type, x-upload-offset');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const upload = multer({ dest: TMP_DIR, limits: { fileSize: MAX_UPLOAD_BYTES } });

// Fila de conversão: só 1 FFmpeg por vez (a VPS é compartilhada com outros serviços)
const jobs = new Map(); // jobId -> { status: queued|processing|done|error, workoutId, position?, error? }
const queue = []; // [{ jobId, inputPath, workoutId }]
let running = false;

function refreshPositions() {
  queue.forEach((j, i) => {
    const cur = jobs.get(j.jobId);
    if (cur?.status === 'queued') jobs.set(j.jobId, { ...cur, position: i + 1 });
  });
}

function enqueue(jobId, inputPath, workoutId) {
  queue.push({ jobId, inputPath, workoutId });
  jobs.set(jobId, { status: 'queued', workoutId, position: queue.length });
  refreshPositions();
  pump();
}

async function pump() {
  if (running) return;
  const job = queue.shift();
  if (!job) return;
  running = true;
  refreshPositions();
  jobs.set(job.jobId, { status: 'processing', workoutId: job.workoutId });
  try {
    await processJob(job.jobId, job.inputPath, job.workoutId);
  } finally {
    running = false;
    refreshPositions();
    pump(); // segue para o próximo da fila
  }
}

// ---------- auth ----------
async function userFromRequest(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
const requireAdmin = asyncRoute(async (req, res, next) => {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { data: prof } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (prof?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  req.user = user;
  next();
});

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
  const stagedOutput = path.join(VIDEO_DIR, `${workoutId}.${jobId}.tmp.mp4`);
  try {
    await transcode(inputPath, stagedOutput);
    fs.renameSync(stagedOutput, output);
    const { error } = await db.from('workouts')
      .update({ video_path: `${workoutId}.mp4`, youtube_id: null }).eq('id', workoutId);
    if (error) throw error;
    jobs.set(jobId, { status: 'done', workoutId, size: fs.statSync(output).size });
    console.log(`[job ${jobId}] pronto -> ${output}`);
  } catch (e) {
    jobs.set(jobId, { status: 'error', workoutId, error: String(e.message || e) });
    console.error(`[job ${jobId}] erro:`, e.message);
  } finally {
    fs.rm(stagedOutput, { force: true }, () => {});
    fs.rm(inputPath, { force: true }, () => {});
    fs.rm(uploadPaths(jobId).meta, { force: true }, () => {});
  }
}

// ---------- rotas ----------
app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    videos: fs.readdirSync(VIDEO_DIR).length,
    converting: running,
    queued: queue.length,
  })
);

// Envio em partes. O progresso fica em disco para retomar após interrupções.
app.post('/upload/init', requireAdmin, asyncRoute(async (req, res) => {
  const { workout_id: workoutId, file_size: fileSize } = req.body ?? {};
  if (!/^[0-9a-f-]{36}$/i.test(workoutId ?? '')
      || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ error: 'treino ou tamanho de vídeo inválido' });
  }
  const { data: workout } = await db.from('workouts').select('id').eq('id', workoutId).maybeSingle();
  if (!workout) return res.status(404).json({ error: 'treino não encontrado' });

  cleanupStaleUploads();
  const uploadId = crypto.randomUUID();
  const paths = uploadPaths(uploadId);
  fs.writeFileSync(paths.part, '');
  writeUpload({ paths, userId: req.user.id, workoutId, totalBytes: fileSize,
    receivedBytes: 0, status: 'uploading' });
  return res.status(201).json({ upload_id: uploadId, received_bytes: 0 });
}));

app.get('/upload/:uploadId', requireAdmin, (req, res) => {
  const uploadState = readUpload(req.params.uploadId);
  if (!uploadState || uploadState.userId !== req.user.id) return res.sendStatus(404);
  return res.json({ received_bytes: uploadState.receivedBytes,
    total_bytes: uploadState.totalBytes, status: jobs.get(req.params.uploadId)?.status ?? uploadState.status });
});

app.put('/upload/:uploadId/chunk', requireAdmin, asyncRoute(async (req, res) => {
  const uploadId = req.params.uploadId;
  const uploadState = readUpload(uploadId);
  if (!uploadState || uploadState.userId !== req.user.id) return res.sendStatus(404);
  const offset = Number(req.headers['x-upload-offset']);
  const length = Number(req.headers['content-length']);
  if (uploadState.status !== 'uploading' || !Number.isSafeInteger(offset)
      || offset !== uploadState.receivedBytes || !Number.isSafeInteger(length)
      || length <= 0 || length > MAX_CHUNK_BYTES || offset + length > uploadState.totalBytes) {
    return res.status(409).json({ error: 'parte fora de ordem', received_bytes: uploadState.receivedBytes });
  }
  if (inFlightUploads.has(uploadId)) return res.status(409).json({ error: 'envio em andamento' });

  inFlightUploads.add(uploadId);
  try {
    await pipeline(req, fs.createWriteStream(uploadState.paths.part, { flags: 'r+', start: offset }));
    if (!req.complete) throw new Error('parte incompleta');
    uploadState.receivedBytes += length;
    writeUpload(uploadState);
    return res.json({ received_bytes: uploadState.receivedBytes });
  } catch (error) {
    console.warn(`[upload ${uploadId}] parte interrompida: ${error.message}`);
    if (!res.headersSent && !res.destroyed) return res.status(400).json({ error: 'parte incompleta' });
  } finally {
    inFlightUploads.delete(uploadId);
  }
}));

app.post('/upload/:uploadId/finish', requireAdmin, (req, res) => {
  const uploadId = req.params.uploadId;
  const uploadState = readUpload(uploadId);
  if (!uploadState || uploadState.userId !== req.user.id) return res.sendStatus(404);
  if (uploadState.status === 'processing') return res.status(202).json({ job_id: uploadId });
  if (uploadState.receivedBytes !== uploadState.totalBytes) {
    return res.status(409).json({ error: 'vídeo incompleto', received_bytes: uploadState.receivedBytes });
  }
  if (!fs.existsSync(uploadState.paths.part)
      || fs.statSync(uploadState.paths.part).size < uploadState.totalBytes) {
    return res.status(409).json({ error: 'arquivo temporário incompleto' });
  }
  uploadState.status = 'processing';
  writeUpload(uploadState);
  enqueue(uploadId, uploadState.paths.part, uploadState.workoutId);
  return res.status(202).json({ job_id: uploadId });
});

// Admin envia o vídeo bruto
app.post('/upload', requireAdmin, upload.single('video'), async (req, res) => {
  const workoutId = req.body.workout_id;
  if (!workoutId || !req.file) return res.status(400).json({ error: 'workout_id e video obrigatorios' });
  const jobId = crypto.randomUUID();
  enqueue(jobId, req.file.path, workoutId); // converte 1 por vez
  res.status(202).json({ job_id: jobId, queued: queue.length });
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

// Retoma conversões interrompidas por reinício do serviço.
for (const name of fs.readdirSync(TMP_DIR).filter((file) => /^[0-9a-f-]{36}\.json$/i.test(file))) {
  const id = name.slice(0, -5);
  const uploadState = readUpload(id);
  if (uploadState?.status === 'processing' && fs.existsSync(uploadState.paths.part)
      && uploadState.receivedBytes === uploadState.totalBytes) {
    enqueue(id, uploadState.paths.part, uploadState.workoutId);
  }
}
