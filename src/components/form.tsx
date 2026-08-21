import { Check, Loader2, UploadCloud } from 'lucide-react';
import { forwardRef } from 'react';

/* Classe única dos campos, para input, select e textarea não divergirem com o
   tempo. A borda usa --color-border, um pouco mais firme que o divisor de 10%
   que havia aqui: com ele os campos quase sumiam no branco do cartão e o
   formulário parecia uma lista de rótulos soltos. */
const campo =
  'w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-black)] outline-none transition-colors placeholder:text-[var(--color-medium-grey)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-rose)] focus:ring-2 focus:ring-[rgba(233,30,99,0.15)] disabled:cursor-not-allowed disabled:bg-[var(--color-warm-grey)] disabled:text-[var(--color-medium-grey)]';

const rotulo = 'mb-1.5 block text-sm font-semibold text-[var(--color-black)]';

const auxiliar = 'mt-1.5 block text-xs leading-snug text-[var(--color-medium-grey)]';

/** Campo de texto. */
export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }
>(function TextInput({ label, hint, id, className = '', ...props }, ref) {
  return (
    <label className="block">
      <span className={rotulo}>{label}</span>
      <input ref={ref} id={id} className={`${campo} ${className}`} {...props} />
      {hint && <span className={auxiliar}>{hint}</span>}
    </label>
  );
});

/** Select com o mesmo tratamento do TextInput, para os dois combinarem. */
export const SelectInput = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }
>(function SelectInput({ label, hint, id, className = '', children, ...props }, ref) {
  return (
    <label className="block">
      <span className={rotulo}>{label}</span>
      <select ref={ref} id={id} className={`${campo} ${className}`} {...props}>
        {children}
      </select>
      {hint && <span className={auxiliar}>{hint}</span>}
    </label>
  );
});

/** Área de texto. Existia solta em cada tela, cada uma com uma borda diferente. */
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }
>(function TextArea({ label, hint, id, className = '', rows = 3, ...props }, ref) {
  return (
    <label className="block">
      <span className={rotulo}>{label}</span>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`${campo} resize-y ${className}`}
        {...props}
      />
      {hint && <span className={auxiliar}>{hint}</span>}
    </label>
  );
});

/**
 * Campo de arquivo.
 *
 * O <input type="file"> cru é o controle mais feio do HTML: o botão "Escolher
 * arquivo" vem com o desenho do sistema operacional e ignora qualquer estilo,
 * então destoava de todo o resto do formulário. Aqui ele fica escondido
 * (`sr-only`, ainda acessível pelo teclado) e quem aparece é a área tracejada,
 * que também tem para onde mostrar o arquivo escolhido.
 */
export function FileField({
  label,
  hint,
  accept,
  selected,
  status,
  onFile,
  disabled,
}: {
  label: string;
  hint?: string;
  accept?: string;
  /** Nome do arquivo escolhido agora, se houver. */
  selected?: string | null;
  /** Selo curto de "já existe" — ex.: "publicado", "enviada". */
  status?: string | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-semibold text-[var(--color-black)]">{label}</span>
        {status && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
            <Check size={11} /> {status}
          </span>
        )}
      </div>

      <label
        className={`flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-[var(--color-rose)] hover:bg-[rgba(233,30,99,0.03)]'
        }`}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-rose)]">
          <UploadCloud size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--color-black)]">
            {selected ?? 'Escolher arquivo'}
          </span>
          {hint && (
            <span className="mt-0.5 block text-xs leading-snug text-[var(--color-medium-grey)]">
              {hint}
            </span>
          )}
        </span>
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

/**
 * Caixa de marcar.
 *
 * Vira um bloco clicável inteiro em vez de um quadradinho de 13px perdido ao
 * lado de um texto: o alvo fica do tamanho da linha e a opção deixa de parecer
 * uma sobra no fim do formulário.
 */
export function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 transition-colors hover:border-[var(--color-border-strong)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[var(--color-border-strong)] accent-[var(--color-rose)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--color-black)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-[var(--color-medium-grey)]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * Bloco de campos com um título curto.
 *
 * Um formulário de dez campos empilhados sem hierarquia obriga a ler tudo para
 * achar um. Agrupado em "Identificação", "Classificação" e "Mídia", bate o olho
 * e acha.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-medium-grey)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs leading-snug text-[var(--color-medium-grey)]">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Empilha as seções e desenha o divisor entre elas. */
export function FormSections({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-[var(--color-border)] [&>section+section]:pt-6">
      {children}
    </div>
  );
}

/** Duas colunas no desktop, uma no celular. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/**
 * Botão de envio.
 *
 * `variant` existe porque duas ações rosas de largura total, empilhadas,
 * disputam a atenção e nenhuma vence — o secundário resolve a hierarquia.
 * `block` continua padrão: nas telas de login e cadastro a largura total é
 * o certo. No rodapé dos modais passa-se `block={false}`.
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
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60';

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
