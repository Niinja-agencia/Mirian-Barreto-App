import { useCallback, useEffect, useRef } from 'react';

// Mantém a tela ligada enquanto o treino está tocando (Screen Wake Lock API).
// Evita que o celular bloqueie sozinho durante a aula.
type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> };

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinelLike | null>(null);
  const wantedRef = useRef(false);

  const acquire = useCallback(async () => {
    wantedRef.current = true;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;
    try {
      if (!lockRef.current || lockRef.current.released) {
        lockRef.current = await nav.wakeLock.request('screen');
      }
    } catch {
      /* alguns navegadores bloqueiam fora de gesto do usuário — ignora */
    }
  }, []);

  const release = useCallback(async () => {
    wantedRef.current = false;
    try {
      await lockRef.current?.release();
    } catch {
      /* noop */
    }
    lockRef.current = null;
  }, []);

  // Reobtém o lock quando a aba volta a ficar visível (o lock cai ao trocar de app)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wantedRef.current) acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      release();
    };
  }, [acquire, release]);

  return { acquire, release };
}
