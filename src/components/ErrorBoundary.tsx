import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { ehFalhaDeChunk, recarregarLimpando, recuperarDeChunkQuebrado } from '@/lib/chunkGuard';

/**
 * Rede de segurança da árvore de rotas.
 *
 * Sem isto, qualquer erro dentro de uma rota derruba o React inteiro e sobra
 * uma tela preta (o body do app é preto), sem nenhuma pista do que houve e sem
 * como sair dali a não ser limpando o navegador na mão.
 *
 * Quando o erro é de pedaço de JS que não carregou, tenta a recuperação
 * automática antes de mostrar qualquer coisa: na maioria das vezes a pessoa só
 * vê a página recarregar sozinha.
 */
interface Props {
  children: ReactNode;
}
interface State {
  erro: Error | null;
  recuperando: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null, recuperando: false };

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro, recuperando: ehFalhaDeChunk(erro) };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro na rota:', erro, info.componentStack);
    if (ehFalhaDeChunk(erro)) {
      // Se a trava já foi usada nesta sessão, não recarrega de novo: mostra a
      // tela abaixo, com o botão, em vez de piscar para sempre.
      void recuperarDeChunkQuebrado().then((tentou) => {
        if (!tentou) this.setState({ recuperando: false });
      });
    }
  }

  render() {
    const { erro, recuperando } = this.state;
    if (!erro) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-black)] p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(233,30,99,0.1)] text-[var(--color-rose)]">
            <RefreshCw size={22} className={recuperando ? 'animate-spin' : ''} />
          </div>

          <h1 className="mt-4 text-lg font-bold text-[var(--color-black)]">
            {recuperando ? 'Atualizando o app…' : 'Não foi possível abrir esta página'}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-[var(--color-medium-grey)]">
            {recuperando
              ? 'Saiu uma versão nova enquanto você usava. Já estamos recarregando.'
              : 'Pode ter sobrado arquivo antigo guardado no seu navegador. Recarregar costuma resolver.'}
          </p>

          {!recuperando && (
            <button
              onClick={() => void recarregarLimpando()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-rose)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[var(--color-rose-hover)]"
            >
              <RefreshCw size={16} /> Recarregar
            </button>
          )}
        </div>
      </div>
    );
  }
}
