import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, PictureInPicture2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useWakeLock } from '@/hooks/useWakeLock';

const VIDEO_HOST = import.meta.env.VITE_VIDEO_HOST as string;

/**
 * Player protegido:
 * - URL assinada de curta duração pelo worker da VPS (POST /sign, valida plano);
 * - sem download / menu de contexto; marca d'água com o e-mail da aluna;
 * - Wake Lock: a tela não apaga durante o treino;
 * - Media Session: controles na tela de bloqueio + áudio em background (Android);
 * - Picture-in-Picture.
 * Obs.: proteção client-side não impede gravação de tela (p/ DRM real, usar Bunny/Cloudflare).
 */
export default function ProtectedVideo({
  workoutId,
  title,
  artwork,
}: {
  workoutId: string;
  title?: string;
  artwork?: string | null;
}) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { acquire, release } = useWakeLock();

  useEffect(() => {
    let active = true;
    setUrl(null);
    setError(null);
    (async () => {
      // O vídeo é servido pela VPS: pedimos uma URL assinada de curta duração.
      // O servidor valida o plano ativo antes de assinar.
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        if (active) setError('Sessão expirada. Entre novamente.');
        return;
      }
      const pedirUrl = (jwt: string) =>
        fetch(`${VIDEO_HOST}/sign`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ workout_id: workoutId }),
        });

      try {
        let res = await pedirUrl(token);

        // 401 = o servidor não aceitou o token. Acontece quando a sessão
        // guardada no navegador ficou para trás (aba aberta há horas, troca de
        // dispositivo). Renova uma vez e tenta de novo antes de acusar erro —
        // senão a aluna via "verifique se seu plano está ativo" com o plano em dia.
        if (res.status === 401) {
          const { data: renovada } = await supabase.auth.refreshSession();
          const novoToken = renovada.session?.access_token;
          if (!active) return;
          if (!novoToken) {
            setError('Sua sessão expirou. Entre novamente.');
            return;
          }
          res = await pedirUrl(novoToken);
        }

        if (!active) return;
        if (!res.ok) {
          setError(
            res.status === 403
              ? 'Este treino não está incluído no seu plano.'
              : res.status === 401
                ? 'Sua sessão expirou. Entre novamente.'
                : 'Não foi possível carregar o vídeo. Verifique se seu plano está ativo.'
          );
          return;
        }
        const data = await res.json();
        setUrl(data.url as string);
      } catch {
        if (active) setError('Não foi possível carregar o vídeo. Tente novamente.');
      }
    })();
    return () => {
      active = false;
    };
  }, [workoutId]);

  // Media Session (controles na lock screen) + Wake Lock
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !url) return;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Treino',
        artist: 'Mirian Barreto',
        album: 'App de Treinos',
        artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/png' }] : [],
      });
      const set = (a: MediaSessionAction, h: () => void) => {
        try {
          navigator.mediaSession.setActionHandler(a, h);
        } catch {
          /* ação não suportada */
        }
      };
      set('play', () => v.play());
      set('pause', () => v.pause());
      set('seekbackward', () => (v.currentTime = Math.max(0, v.currentTime - 10)));
      set('seekforward', () => (v.currentTime = Math.min(v.duration || 0, v.currentTime + 10)));
    }

    const onPlay = () => {
      acquire();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    const onPause = () => {
      release();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', release);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', release);
      release();
    };
  }, [url, title, artwork, acquire, release]);

  async function togglePip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* PiP indisponível neste navegador */
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex aspect-[9/16] w-full max-w-[420px] flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--color-black)] text-center text-white">
        <AlertCircle className="text-[var(--color-rose)]" size={32} />
        <p className="max-w-sm text-sm text-[rgba(255,255,255,0.8)]">{error}</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="mx-auto flex aspect-[9/16] w-full max-w-[420px] items-center justify-center rounded-2xl bg-[var(--color-black)]">
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
        playsInline
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full object-contain"
      />
      {/* Botão Picture-in-Picture */}
      {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
        <button
          onClick={togglePip}
          aria-label="Picture-in-Picture"
          className="absolute right-2 top-2 rounded-lg bg-black/50 p-2 text-white/90 hover:bg-black/70"
        >
          <PictureInPicture2 size={18} />
        </button>
      )}
      {/* Marca d'água discreta */}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/40 px-2 py-1 text-[10px] tracking-wide text-white/70">
        {user?.email}
      </div>
    </div>
  );
}
