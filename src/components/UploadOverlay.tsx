import { Loader2, UploadCloud, Clapperboard } from 'lucide-react';
import { formatBytes, formatEta } from '@/lib/format';
import type { UploadProgress } from '@/lib/videoHost';

/**
 * Tela cheia de progresso do envio/conversão do vídeo.
 * Bem visível de propósito: uploads de vídeo demoram e a pessoa precisa
 * enxergar claramente que está acontecendo algo e quanto falta.
 */
export default function UploadOverlay({
  phase,
  progress,
}: {
  phase: 'uploading' | 'converting';
  progress: UploadProgress | null;
}) {
  const pct = progress?.pct ?? 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[var(--color-black)]/95 p-6">
      <div className="w-full max-w-xl text-center text-white">
        {phase === 'uploading' ? (
          <>
            <UploadCloud className="mx-auto mb-6 text-[var(--color-rose)]" size={64} strokeWidth={1.5} />
            <h2
              className="mb-2 font-semibold"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}
            >
              Enviando vídeo
            </h2>

            {/* Porcentagem gigante */}
            <p
              className="font-bold leading-none text-[var(--color-rose)]"
              style={{ fontSize: 'clamp(3.5rem, 14vw, 6rem)' }}
            >
              {pct}%
            </p>

            {/* Barra grossa */}
            <div className="mx-auto mt-6 h-5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[var(--color-rose)] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Números */}
            {progress && (
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-wider text-white/60">Enviado</p>
                  <p className="mt-1 text-base font-semibold">
                    {formatBytes(progress.loaded)}
                    <span className="text-white/50"> / {formatBytes(progress.total)}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-wider text-white/60">Velocidade</p>
                  <p className="mt-1 text-base font-semibold">{formatBytes(progress.bytesPerSec)}/s</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-wider text-white/60">Tempo restante</p>
                  <p className="mt-1 text-base font-semibold">{formatEta(progress.etaSec)}</p>
                </div>
              </div>
            )}

            <p className="mt-8 text-sm text-white/70">
              Mantenha esta janela aberta até o envio terminar.
            </p>
          </>
        ) : (
          <>
            <Clapperboard className="mx-auto mb-6 text-[var(--color-rose)]" size={64} strokeWidth={1.5} />
            <h2
              className="mb-3 font-semibold"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}
            >
              Convertendo no servidor
            </h2>
            <div className="mx-auto mb-6 flex items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[var(--color-rose)]" size={28} />
              <span className="text-lg text-white/80">Processando o vídeo…</span>
            </div>
            {/* barra indeterminada */}
            <div className="mx-auto h-5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-1/3 animate-[indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-[var(--color-rose)]" />
            </div>
            <p className="mt-8 text-sm text-white/70">
              O envio terminou. A conversão continua no servidor mesmo se você fechar esta janela —
              o treino é publicado automaticamente ao final.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
