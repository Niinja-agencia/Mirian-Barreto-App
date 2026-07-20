// Comunicação com o worker de vídeo na VPS (upload + conversão automática).
const VIDEO_HOST = import.meta.env.VITE_VIDEO_HOST as string;

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
  bytesPerSec: number;
  etaSec: number;
}

/** Envia o vídeo bruto. Retorna o job_id da conversão. */
export function uploadWorkoutVideo(
  file: File,
  workoutId: string,
  token: string,
  onProgress: (p: UploadProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('workout_id', workoutId);
    form.append('video', file);

    const started = Date.now();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${VIDEO_HOST}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const elapsed = (Date.now() - started) / 1000;
      const bytesPerSec = elapsed > 0 ? e.loaded / elapsed : 0;
      const etaSec = bytesPerSec > 0 ? Math.max(0, (e.total - e.loaded) / bytesPerSec) : 0;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        pct: Math.round((e.loaded / e.total) * 100),
        bytesPerSec,
        etaSec,
      });
    };
    xhr.onload = () => {
      if (xhr.status === 202) {
        try {
          resolve(JSON.parse(xhr.responseText).job_id as string);
        } catch {
          reject(new Error('Resposta inválida do servidor de vídeo.'));
        }
      } else {
        reject(new Error(`Falha no envio (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o vídeo.'));
    xhr.send(form);
  });
}

export interface JobStatus {
  status: 'queued' | 'processing' | 'done' | 'error';
  /** posição na fila quando status === 'queued' */
  position?: number;
  error?: string;
}

export async function getJobStatus(jobId: string, token: string): Promise<JobStatus> {
  const res = await fetch(`${VIDEO_HOST}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Não foi possível consultar a conversão.');
  return res.json();
}

/** Aguarda a conversão terminar (consulta a cada 5s). */
export async function waitForConversion(
  jobId: string,
  token: string,
  onUpdate?: (job: JobStatus) => void
): Promise<void> {
  for (;;) {
    const job = await getJobStatus(jobId, token);
    onUpdate?.(job);
    if (job.status === 'done') return;
    if (job.status === 'error') throw new Error(job.error || 'Erro na conversão.');
    await new Promise((r) => setTimeout(r, 5000));
  }
}
