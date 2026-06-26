import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/**
 * Player protegido:
 * - busca uma URL assinada de curta duração via Edge Function 'video-url'
 *   (que valida assinatura ativa no servidor);
 * - desabilita download e menu de contexto;
 * - sobrepõe marca d'água com o e-mail da aluna (inibe revenda).
 * Observação: nenhuma proteção client-side impede gravação de tela —
 * para isso seria necessário migrar para HLS+DRM (ex.: Bunny/Cloudflare Stream).
 */
export default function ProtectedVideo({ workoutId }: { workoutId: string }) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setError(null);
    (async () => {
      const { data, error } = await supabase.functions.invoke('video-url', {
        body: { workout_id: workoutId },
      });
      if (!active) return;
      if (error || !data?.url) {
        setError('Não foi possível carregar o vídeo. Verifique se seu plano está ativo.');
        return;
      }
      setUrl(data.url as string);
    })();
    return () => {
      active = false;
    };
  }, [workoutId]);

  if (error) {
    return (
      <div className="flex mx-auto aspect-[9/16] w-full max-w-[420px] flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--color-black)] text-center text-white">
        <AlertCircle className="text-[var(--color-rose)]" size={32} />
        <p className="max-w-sm text-sm text-[rgba(255,255,255,0.8)]">{error}</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex mx-auto aspect-[9/16] w-full max-w-[420px] items-center justify-center rounded-2xl bg-[var(--color-black)]">
        <Loader2 className="animate-spin text-[var(--color-rose)]" size={32} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={url}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full object-contain"
      />
      {/* Marca d'água discreta */}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/40 px-2 py-1 text-[10px] tracking-wide text-white/70">
        {user?.email}
      </div>
    </div>
  );
}
