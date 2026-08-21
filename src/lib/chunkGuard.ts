/**
 * Recuperação de pedaço de JS que não carrega.
 *
 * Cada rota é um arquivo separado (React.lazy), então abrir uma página baixa um
 * arquivo próprio. Depois de um deploy, o navegador ou o cache do service
 * worker pode continuar pedindo um arquivo que não existe mais no servidor, e
 * como a hospedagem responde index.html para caminho desconhecido, o que chega
 * é HTML no lugar de um módulo. O import falha, ninguém trata, e o React
 * desmonta a árvore inteira: a tela fica preta e nem recarregar resolve, porque
 * o cache antigo continua lá.
 *
 * A saída é limpar o cache do service worker e recarregar UMA vez. A trava em
 * sessionStorage existe para não virar laço de recarga caso o arquivo esteja
 * mesmo faltando no servidor: aí é melhor a pessoa ver a tela de erro.
 */
const CHAVE = 'mb-recarga-chunk';

/** Erros de import de módulo têm mensagens diferentes em cada navegador. */
function ehFalhaDeChunk(erro: unknown): boolean {
  const msg =
    typeof erro === 'string'
      ? erro
      : erro instanceof Error
        ? `${erro.name}: ${erro.message}`
        : String(erro ?? '');

  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /'text\/html' is not a valid JavaScript MIME type/i.test(msg)
  );
}

/** Apaga o que o service worker guardou e o tira do caminho. */
export async function limparCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const chaves = await caches.keys();
      await Promise.all(chaves.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // Se nem limpar deu, ainda vale tentar recarregar.
  }
}

/** Limpa e recarrega, no máximo uma vez por sessão. */
export async function recuperarDeChunkQuebrado(): Promise<boolean> {
  if (sessionStorage.getItem(CHAVE)) return false;
  sessionStorage.setItem(CHAVE, '1');
  await limparCaches();
  window.location.reload();
  return true;
}

/** Força a limpeza e recarrega, ignorando a trava (botão "Recarregar"). */
export async function recarregarLimpando(): Promise<void> {
  sessionStorage.removeItem(CHAVE);
  await limparCaches();
  window.location.reload();
}

export function instalarGuardaDeChunk(): void {
  // Evento próprio do Vite para preload de rota que não carregou.
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    void recuperarDeChunkQuebrado();
  });

  // Rede do Suspense/lazy: a promessa rejeitada não passa pelo evento acima.
  window.addEventListener('unhandledrejection', (e) => {
    if (ehFalhaDeChunk(e.reason)) void recuperarDeChunkQuebrado();
  });

  window.addEventListener('error', (e) => {
    if (ehFalhaDeChunk(e.error ?? e.message)) void recuperarDeChunkQuebrado();
  });

  // Se o app está de pé há dez segundos, a sessão está saudável: solta a trava
  // para que uma falha futura (outro deploy no meio do uso) também possa se
  // recuperar sozinha.
  window.addEventListener('load', () => {
    window.setTimeout(() => sessionStorage.removeItem(CHAVE), 10_000);
  });
}

export { ehFalhaDeChunk };
