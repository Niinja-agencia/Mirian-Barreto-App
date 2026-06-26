import { useEffect, useState } from 'react';
import { Download, Share, X, Plus } from 'lucide-react';

const DISMISS_KEY = 'mb-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(false); // Android: temos o evento
  const [showIOS, setShowIOS] = useState(false); // iOS: instruções
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // já instalado
    if (localStorage.getItem(DISMISS_KEY)) return;

    if (window.__deferredInstallPrompt) setCanPrompt(true);
    const onAvail = () => setCanPrompt(true);
    window.addEventListener('mb-install-available', onAvail);

    const onInstalled = () => {
      setCanPrompt(false);
      setShowIOS(false);
      localStorage.setItem(DISMISS_KEY, '1');
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS: sem evento de instalação — mostra instruções
    if (isIOS() && !isStandalone()) setShowIOS(true);

    return () => {
      window.removeEventListener('mb-install-available', onAvail);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setCanPrompt(false);
    setShowIOS(false);
  }

  async function install() {
    const e = window.__deferredInstallPrompt;
    if (!e) return;
    await e.prompt();
    await e.userChoice;
    window.__deferredInstallPrompt = undefined;
    setCanPrompt(false);
  }

  if (!canPrompt && !showIOS) return null;

  return (
    <>
      {/* Banner */}
      <div className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-md rounded-2xl bg-[var(--color-black)] p-4 text-white shadow-2xl md:left-auto md:right-4 md:mx-0">
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-2 top-2 text-white/60 hover:text-white"
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-rose)] font-bold">
            MB
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Instale o app da Mirian</p>
            <p className="text-xs text-white/70">Acesse seus treinos direto da tela inicial.</p>
          </div>
          {canPrompt ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-rose)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-rose-hover)]"
            >
              <Download size={16} /> Instalar
            </button>
          ) : (
            <button
              onClick={() => setIosOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-rose)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-rose-hover)]"
            >
              Como instalar
            </button>
          )}
        </div>
      </div>

      {/* Instruções iOS */}
      {iosOpen && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-4" onClick={() => setIosOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 text-[var(--color-black)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Adicionar à Tela de Início</h2>
              <button onClick={() => setIosOpen(false)} className="text-[var(--color-medium-grey)]">
                <X size={20} />
              </button>
            </div>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-warm-grey)] font-semibold">1</span>
                <span className="flex items-center gap-1">
                  Toque no ícone <Share size={18} className="text-[var(--color-rose)]" /> <b>Compartilhar</b> na barra do Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-warm-grey)] font-semibold">2</span>
                <span className="flex items-center gap-1">
                  Escolha <Plus size={18} className="text-[var(--color-rose)]" /> <b>Adicionar à Tela de Início</b>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-warm-grey)] font-semibold">3</span>
                <span>Toque em <b>Adicionar</b>. Pronto! O app aparece na sua tela inicial. 💪</span>
              </li>
            </ol>
            <button
              onClick={() => {
                setIosOpen(false);
                dismiss();
              }}
              className="mt-6 w-full rounded-lg bg-[var(--color-black)] py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
