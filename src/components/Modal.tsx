import { X } from 'lucide-react';
import { useEffect } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const larguras: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

/**
 * Janela de cadastro do painel.
 *
 * Três faixas: cabeçalho, corpo e rodapé, e só o corpo rola. Antes o cartão
 * inteiro crescia junto com o formulário e a página atrás é que rolava, então
 * num formulário comprido (o de treino, por exemplo) o título saía por cima da
 * tela e o botão de salvar ficava lá embaixo, fora de vista.
 *
 * As ações moram no rodapé (`footer`), fora da área que rola, para "Salvar"
 * continuar sempre visível. Como o rodapé fica fora do <form>, o botão de
 * submit se liga a ele pelo atributo `form={id}`.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  footer,
  closeOnBackdrop = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    // Trava a página atrás: sem isso a roda do mouse rola o fundo assim que o
    // corpo do modal chega ao fim.
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = antes;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl animate-in zoom-in-95 duration-200 ${larguras[size]}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-[var(--color-black)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[var(--color-medium-grey)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-[var(--color-medium-grey)] transition-colors hover:bg-[var(--color-warm-grey)] hover:text-[var(--color-black)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
