import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Check, Loader2, QrCode, CreditCard, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { brl, annualConfigured, annualSavings, type Billing } from '@/lib/format';
import type { Plan, PaymentMethod } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface PixResult {
  qr_code_base64?: string;
  qr_code?: string;
}

export default function Checkout() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentLang } = useLanguage();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('credit_card');
  // O período vem da tela de planos (?billing=annual) e pode ser trocado aqui.
  const [billing, setBilling] = useState<Billing>(
    searchParams.get('billing') === 'annual' ? 'annual' : 'monthly'
  );
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<PixResult | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('plans').select('*').eq('slug', slug).maybeSingle();
      setPlan(data ?? null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <FullScreenLoader />;
  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-black)] text-white">
        <p>Plano não encontrado.</p>
        <Link to="/app/assinatura" className="text-[var(--color-rose)] hover:underline">
          Ver planos
        </Link>
      </div>
    );
  }

  const isAvulso = plan.slug === 'avulso';
  // Anual só entra em cena quando o preço de 12 meses foi definido no painel.
  // Sem isso, price_annual vem igual ao mensal e o app venderia um ano pelo
  // preço de um mês.
  const temAnual =
    !isAvulso && annualConfigured(Number(plan.price_monthly), Number(plan.price_annual));
  const periodo: Billing = temAnual && billing === 'annual' ? 'annual' : 'monthly';
  const price = Number(periodo === 'annual' ? plan.price_annual : plan.price_monthly);
  const economia = isAvulso
    ? null
    : annualSavings(Number(plan.price_monthly), Number(plan.price_annual));
  // Avulso é compra única; nos demais, cartão é recorrente e Pix é avulso.
  const isRecurring = method === 'credit_card' && !isAvulso;

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    setPix(null);
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan_slug: plan!.slug, billing: periodo, method },
    });
    setSubmitting(false);

    if (error || !data) {
      toast.error('Não foi possível iniciar o pagamento. Tente novamente.');
      return;
    }
    if (data.init_point) {
      window.location.href = data.init_point as string; // Checkout Pro / assinatura MP
      return;
    }
    if (data.pix) {
      setPix(data.pix as PixResult);
      return;
    }
    toast.error('Resposta de pagamento inesperada.');
  }

  function copyPix() {
    if (pix?.qr_code) {
      navigator.clipboard.writeText(pix.qr_code);
      toast.success('Código Pix copiado!');
    }
  }

  const features = currentLang === 'pt' ? plan.features_pt : plan.features_en;

  return (
    <div className="min-h-screen bg-[var(--color-warm-grey)] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          {/* Resumo do plano */}
          <div
            className="rounded-2xl bg-[var(--color-black)] p-6 text-white md:col-span-2"
          >
            <p className="text-sm text-[rgba(255,255,255,0.6)]">Plano</p>
            <p className="text-2xl font-bold">
              {currentLang === 'pt' ? plan.name_pt : plan.name_en}
            </p>
            <p className="mt-4 text-3xl font-bold">
              {brl(price)}
              <span className="text-sm font-normal text-[rgba(255,255,255,0.6)]">
                {isAvulso ? ' único' : periodo === 'annual' ? '/ano' : '/mês'}
              </span>
            </p>
            <ul className="mt-6 space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[rgba(255,255,255,0.85)]">
                  <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-rose)]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pagamento */}
          <div
            className="rounded-2xl bg-white p-6 md:col-span-3"
            style={{ border: '1px solid var(--color-divider-dark)' }}
          >
            {pix ? (
              <div className="text-center">
                <h2 className="mb-2 font-semibold text-[var(--color-black)]">Pague com Pix</h2>
                <p className="mb-4 text-sm text-[var(--color-medium-grey)]">
                  Escaneie o QR Code ou copie o código. O acesso é liberado automaticamente após a
                  confirmação.
                </p>
                {pix.qr_code_base64 && (
                  <img
                    src={`data:image/png;base64,${pix.qr_code_base64}`}
                    alt="QR Code Pix"
                    className="mx-auto h-56 w-56"
                  />
                )}
                {pix.qr_code && (
                  <button
                    onClick={copyPix}
                    className="mx-auto mt-4 flex items-center gap-2 rounded-lg border border-[var(--color-divider-dark)] px-4 py-2 text-sm text-[var(--color-black)] hover:border-[var(--color-rose)]"
                  >
                    <Copy size={14} /> Copiar código Pix
                  </button>
                )}
              </div>
            ) : (
              <>
                <h2 className="mb-5 font-semibold text-[var(--color-black)]">Pagamento</h2>

                {/* Período — só quando existe preço anual de verdade */}
                {temAnual && (
                  <>
                    <p className="mb-2 text-sm font-medium text-[var(--color-black)]">Período</p>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <ToggleCard
                        active={billing === 'monthly'}
                        onClick={() => setBilling('monthly')}
                        title="Mensal"
                        subtitle={brl(Number(plan.price_monthly))}
                      />
                      <ToggleCard
                        active={billing === 'annual'}
                        onClick={() => setBilling('annual')}
                        title="Anual"
                        subtitle={
                          economia
                            ? `${brl(Number(plan.price_annual))} · ${economia.percentual}% off`
                            : brl(Number(plan.price_annual))
                        }
                      />
                    </div>
                  </>
                )}

                {/* Método */}
                <p className="mb-2 text-sm font-medium text-[var(--color-black)]">Forma de pagamento</p>
                <div className="mb-2 grid grid-cols-2 gap-3">
                  <ToggleCard
                    active={method === 'credit_card'}
                    onClick={() => setMethod('credit_card')}
                    title="Cartão"
                    subtitle={isAvulso ? 'À vista' : 'Recorrente'}
                    icon={<CreditCard size={18} />}
                  />
                  <ToggleCard
                    active={method === 'pix'}
                    onClick={() => setMethod('pix')}
                    title="Pix"
                    subtitle="À vista"
                    icon={<QrCode size={18} />}
                  />
                </div>
                {isAvulso ? (
                  <p className="mb-4 text-xs text-[var(--color-medium-grey)]">
                    Compra única — sem assinatura. Você garante o acesso a este treino.
                  </p>
                ) : (
                  !isRecurring && (
                    <p className="mb-4 text-xs text-[var(--color-medium-grey)]">
                      No Pix a cobrança é avulsa (não renova automaticamente). Você receberá um lembrete
                      antes do fim do período.
                    </p>
                  )
                )}

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-rose)] py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white hover:bg-[var(--color-rose-hover)] disabled:opacity-60"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Pagar {brl(price)}
                </button>
                <p className="mt-3 text-center text-xs text-[var(--color-medium-grey)]">
                  Pagamento processado pelo Mercado Pago. Cancele quando quiser.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? 'border-[var(--color-rose)] bg-[rgba(233,30,99,0.05)]'
          : 'border-[var(--color-divider-dark)] hover:border-[var(--color-medium-grey)]'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-black)]">
        {icon}
        {title}
      </span>
      <span className="text-xs text-[var(--color-medium-grey)]">{subtitle}</span>
    </button>
  );
}
