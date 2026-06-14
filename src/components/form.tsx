import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
>(function TextInput({ label, id, className = '', ...props }, ref) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[var(--color-black)] mb-1.5">{label}</span>
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-lg border border-[var(--color-divider-dark)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-black)] outline-none transition-colors focus:border-[var(--color-rose)] focus:ring-2 focus:ring-[rgba(233,30,99,0.15)] disabled:opacity-60 ${className}`}
        {...props}
      />
    </label>
  );
});

export function SubmitButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--color-rose)] py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white transition-all duration-300 hover:bg-[var(--color-rose-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
}
