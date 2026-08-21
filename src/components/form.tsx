import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

/**
 * Campo de texto.
 *
 * A borda usa --color-border, um pouco mais firme que o divisor de 10% que
 * havia aqui: com ele os campos quase sumiam no branco do cartão e o
 * formulário parecia uma lista de rótulos soltos.
 */
export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }
>(function TextInput({ label, hint, id, className = '', ...props }, ref) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">{label}</span>
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-black)] outline-none transition-colors placeholder:text-[var(--color-medium-grey)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-rose)] focus:ring-2 focus:ring-[rgba(233,30,99,0.15)] disabled:cursor-not-allowed disabled:bg-[var(--color-warm-grey)] disabled:text-[var(--color-medium-grey)] ${className}`}
        {...props}
      />
      {hint && <span className="mt-1.5 block text-xs text-[var(--color-medium-grey)]">{hint}</span>}
    </label>
  );
});

/** Select com o mesmo tratamento do TextInput, para os dois combinarem. */
export const SelectInput = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }
>(function SelectInput({ label, id, className = '', children, ...props }, ref) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">{label}</span>
      <select
        ref={ref}
        id={id}
        className={`w-full rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-black)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-rose)] focus:ring-2 focus:ring-[rgba(233,30,99,0.15)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
});

/**
 * Botão de envio.
 *
 * `variant` existe porque duas ações roxas de largura total, empilhadas,
 * disputam a atenção e nenhuma vence — o secundário resolve a hierarquia.
 * `block` continua padrão: nas telas de login e cadastro a largura total é
 * o certo.
 */
export function SubmitButton({
  loading,
  children,
  variant = 'primary',
  block = true,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  block?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60';

  const cor =
    variant === 'primary'
      ? 'bg-[var(--color-rose)] text-white hover:bg-[var(--color-rose-hover)]'
      : 'border border-[var(--color-border-strong)] bg-white text-[var(--color-black)] hover:border-[var(--color-black)]';

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${base} ${cor} ${block ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
}
