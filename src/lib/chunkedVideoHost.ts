// Envio em partes ao worker de vídeo na VPS, com retomada após falha de rede.
const VIDEO_HOST = import.meta.env.VITE_VIDEO_HOST as string;
const CHUNK_BYTES = 32 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 8 * 1024 * 1024 * 1024;
const MAX_RETRIES = 5;

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
  bytesPerSec: number;
  etaSec: number;
}

export type TokenProvider = () => Promise<string>;

interface UploadState {
  received_bytes: number;
  total_bytes: number;
  status: 'uploading' | 'queued' | 'processing' | 'done' | 'error';
}

class UploadRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, token: TokenProvider, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${await token()}`);
  const res = await fetch(`${VIDEO_HOST}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadRequestError(body.error ?? `Falha no envio (HTTP ${res.status}).`, res.status);
  return body as T;
}

function reportProgress(loaded: number, total: number, started: number, startOffset: number,
  onProgress: (progress: UploadProgress) => void) {
  const elapsed = (Date.now() - started) / 1000;
  const bytesPerSec = elapsed > 0 ? (loaded - startOffset) / elapsed : 0;
  onProgress({
    loaded, total, pct: Math.round((loaded / total) * 100), bytesPerSec,
    etaSec: bytesPerSec > 0 ? Math.max(0, (total - loaded) / bytesPerSec) : 0,
  });
}

function sendChunk(uploadId: string, file: File, offset: number, token: string,
  onProgress: (loaded: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const chunk = file.slice(offset, offset + CHUNK_BYTES);
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${VIDEO_HOST}/upload/${uploadId}/chunk`);
    xhr.timeout = 10 * 60 * 1000;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-Upload-Offset', String(offset));
    xhr.upload.onprogress = (event) => onProgress(offset + event.loaded);
    xhr.onload = () => {
      let body: { received_bytes?: number; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* HTTP sem JSON */ }
      if (xhr.status === 200 && typeof body.received_bytes === 'number') resolve(body.received_bytes);
      else reject(new UploadRequestError(body.error ?? `Falha no envio (HTTP ${xhr.status}).`, xhr.status));
    };
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar uma parte do vídeo.'));
    xhr.ontimeout = () => reject(new Error('Tempo esgotado ao enviar uma parte do vídeo.'));
    xhr.send(chunk);
  });
}

/** Envia o vídeo em partes de 32 MB. Se interrompido, continua do último bloco confirmado. */
export async function uploadWorkoutVideo(file: File, workoutId: string, token: TokenProvider,
  onProgress: (progress: UploadProgress) => void): Promise<string> {
  if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
    throw new Error('O vídeo deve ter até 8 GB.');
  }
  const key = `mirian-video:${workoutId}:${file.name}:${file.size}:${file.lastModified}`;
  let uploadId = localStorage.getItem(key);
  let offset = 0;

  if (uploadId) {
    try {
      const state = await api<UploadState>(`/upload/${uploadId}`, token);
      if (state.total_bytes !== file.size) throw new Error('O arquivo mudou desde o último envio.');
      if (state.status !== 'uploading') {
        localStorage.removeItem(key);
        return uploadId;
      }
      offset = state.received_bytes;
    } catch (error) {
      if (!(error instanceof UploadRequestError) || error.status !== 404) throw error;
      localStorage.removeItem(key);
      uploadId = null;
    }
  }

  if (!uploadId) {
    const created = await api<{ upload_id: string }>('/upload/init', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout_id: workoutId, file_size: file.size }),
    });
    uploadId = created.upload_id;
    localStorage.setItem(key, uploadId);
  }

  const started = Date.now();
  const startOffset = offset;
  reportProgress(offset, file.size, started, startOffset, onProgress);

  while (offset < file.size) {
    let sent = false;
    for (let attempt = 0; attempt < MAX_RETRIES && !sent; attempt++) {
      try {
        offset = await sendChunk(uploadId, file, offset, await token(),
          (loaded) => reportProgress(loaded, file.size, started, startOffset, onProgress));
        sent = true;
      } catch (error) {
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`Envio interrompido. Selecione o mesmo arquivo e salve novamente para retomar. ${(error as Error).message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        const state = await api<UploadState>(`/upload/${uploadId}`, token);
        if (state.status !== 'uploading') {
          localStorage.removeItem(key);
          return uploadId;
        }
        offset = state.received_bytes;
        sent = offset >= file.size;
        reportProgress(offset, file.size, started, startOffset, onProgress);
      }
    }
  }

  const finished = await api<{ job_id: string }>(`/upload/${uploadId}/finish`, token, { method: 'POST' });
  localStorage.removeItem(key);
  return finished.job_id;
}

export interface JobStatus {
  status: 'queued' | 'processing' | 'done' | 'error';
  position?: number;
  error?: string;
}

export async function getJobStatus(jobId: string, token: TokenProvider): Promise<JobStatus> {
  return api<JobStatus>(`/status/${jobId}`, token);
}

/** Aguarda a conversão terminar (consulta a cada 5s). */
export async function waitForConversion(jobId: string, token: TokenProvider,
  onUpdate?: (job: JobStatus) => void): Promise<void> {
  for (;;) {
    const job = await getJobStatus(jobId, token);
    onUpdate?.(job);
    if (job.status === 'done') return;
    if (job.status === 'error') throw new Error(job.error || 'Erro na conversão.');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
