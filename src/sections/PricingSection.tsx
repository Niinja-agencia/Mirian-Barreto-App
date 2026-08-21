import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { brl, annualConfigured, annualSavings, type Billing } from '@/lib/format';
import { Check, Shield, XCircle } from 'lucide-react';

interface CardPlan {
  id: string;
  namePt: string;
  nameEn: string;
  descPt: string;
  descEn: string;
  priceMonthly: number;
  priceAnnual: number;
  featuresPt: string[];
  featuresEn: string[];
  highlighted: boolean;
}

// Preços e textos abaixo são só o primeiro quadro, enquanto o banco responde.
// A fonte da verdade é a tabela `plans` — a mesma que o checkout cobra e que o
// painel da Mirian edita. Antes esta lista era a única fonte: mudar o preço no
// painel deixava a landing anunciando o valor antigo e cobrando o novo.
const FALLBACK: CardPlan[] = [
  {
    id: 'avulso',
    namePt: 'Avulso',
    nameEn: 'Single',
    descPt: 'Experimente um treino',
    descEn: 'Try a single workout',
    priceMonthly: 19.90,
    priceAnnual: 19.90,
    featuresPt: ['Apenas 1 treino / videoaula', 'Acesso imediato', 'Sem assinatura'],
    featuresEn: ['Just 1 workout / video class', 'Instant access', 'No subscription'],
    highlighted: false,
  },
  {
    id: 'basic',
    namePt: 'Básico',
    nameEn: 'Basic',
    descPt: 'Perfeito para começar',
    descEn: 'Perfect to get started',
    priceMonthly: 39.90,
    priceAnnual: 39.90,
    featuresPt: ['3 videoaulas', 'Treinos atualizados', 'Suporte via comunidade'],
    featuresEn: ['3 video classes', 'Updated workouts', 'Community support'],
    highlighted: false,
  },
  {
    id: 'premium',
    namePt: 'Premium',
    nameEn: 'Premium',
    descPt: 'O favorito das alunas',
    descEn: "The students' favorite",
    priceMonthly: 69.90,
    priceAnnual: 69.90,
    featuresPt: [
      'Acesso a todos os treinos',
      'Acompanhamento de progresso',
      'Tire suas dúvidas direto com a Mirian',
      'Download offline',
    ],
    featuresEn: [
      'Access to all workouts',
      'Progress tracking',
      'Ask Mirian your questions directly',
      'Offline download',
    ],
    highlighted: true,
  },
  {
    id: 'vip',
    namePt: 'VIP',
    nameEn: 'VIP',
    descPt: 'Para resultados acelerados',
    descEn: 'For accelerated results',
    priceMonthly: 99.90,
    priceAnnual: 99.90,
    featuresPt: [
      'Tudo do Premium',
      'Consultoria nutricional mensal',
      '1 videochamada mensal',
      'Plano totalmente individualizado',
      'Prioridade no suporte',
    ],
    featuresEn: [
      'Everything in Premium',
      'Monthly nutrition consulting',
      '1 monthly video call',
      'Fully individualized plan',
      'Priority support',
    ],
    highlighted: false,
  },
];

/** Avulso é compra única; os demais seguem o período escolhido. */
function sufixo(slug: string, billing: Billing) {
  if (slug === 'avulso') return { pt: 'único', en: 'one-time' };
  return billing === 'annual' ? { pt: '/ano', en: '/yr' } : { pt: '/mês', en: '/mo' };
}

function usePlanos(): CardPlan[] {
  const [planos, setPlanos] = useState<CardPlan[]>(FALLBACK);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (!ativo || !data?.length) return;
      setPlanos(
        data.map((p) => ({
          id: p.slug,
          namePt: p.name_pt,
          nameEn: p.name_en,
          descPt: p.description_pt ?? '',
          descEn: p.description_en ?? '',
          priceMonthly: Number(p.price_monthly),
          priceAnnual: Number(p.price_annual),
          featuresPt: (p.features_pt as string[]) ?? [],
          featuresEn: (p.features_en as string[]) ?? [],
          highlighted: p.highlighted,
        }))
      );
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return planos;
}

function PricingCard({
  plan,
  index,
  billing,
}: {
  plan: CardPlan;
  index: number;
  billing: Billing;
}) {
  const { ref, isVisible } = useScrollReveal();
  const { currentLang } = useLanguage();
  const navigate = useNavigate();
  const isHighlighted = plan.highlighted;
  const isAvulso = plan.id === 'avulso';
  const temAnual = !isAvulso && annualConfigured(plan.priceMonthly, plan.priceAnnual);
  const periodo: Billing = temAnual && billing === 'annual' ? 'annual' : 'monthly';
  const valor = periodo === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  const suf = sufixo(plan.id, periodo);
  const economia = isAvulso ? null : annualSavings(plan.priceMonthly, plan.priceAnnual);

  return (
    <div
      ref={ref}
      className={`pricing-card ${isHighlighted ? 'pricing-card-highlighted' : ''} relative rounded-2xl p-6 lg:p-8 ${
        isVisible ? 'reveal-visible' : ''
      } reveal-pattern-a stagger-${index + 1}`}
      style={{
        background: isHighlighted ? 'var(--color-black)' : 'white',
        border: isHighlighted
          ? '1px solid rgba(233, 30, 99, 0.3)'
          : '1px solid var(--color-divider-dark)',
      }}
    >
      {isHighlighted && (
        <div className="badge-glow absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-rose)] text-white uppercase tracking-[0.08em] text-xs font-medium px-4 py-1.5">
          <span className="tr" data-pt="MAIS POPULAR" data-en="MOST POPULAR">
            MAIS POPULAR
          </span>
        </div>
      )}

      <h3
        className={`font-semibold ${isHighlighted ? 'text-white' : 'text-[var(--color-black)]'}`}
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
      >
        {currentLang === 'pt' ? plan.namePt : plan.nameEn}
      </h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span
          className={`font-bold leading-none ${isHighlighted ? 'text-white' : 'text-[var(--color-black)]'}`}
          style={{ fontSize: 'clamp(1.9rem, 3vw, 2.6rem)' }}
        >
          {brl(valor).replace(/\s/g, '')}
        </span>
        <span className={`text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--color-medium-grey)]'}`}>
          <span className="tr" data-pt={suf.pt} data-en={suf.en}>
            {currentLang === 'pt' ? suf.pt : suf.en}
          </span>
        </span>
      </div>

      {periodo === 'annual' && economia && (
        <p className="mt-2 text-xs font-medium text-[var(--color-rose)]">
          {currentLang === 'pt'
            ? `Economia de ${brl(economia.economia)} por ano`
            : `Save ${brl(economia.economia)} a year`}
        </p>
      )}

      <p className={`mt-2 text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--color-medium-grey)]'}`}>
        {currentLang === 'pt' ? plan.descPt : plan.descEn}
      </p>

      <div className={`my-6 h-px ${isHighlighted ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-[var(--color-divider-dark)]'}`} />

      <ul className="space-y-3 mb-8">
        {(currentLang === 'pt' ? plan.featuresPt : plan.featuresEn).map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check size={18} className="text-[var(--color-rose)] flex-shrink-0 mt-0.5" />
            <span className={`text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.85)]' : 'text-[var(--color-black)]'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() =>
          navigate(`/checkout/${plan.id}${periodo === 'annual' ? '?billing=annual' : ''}`)
        }
        className={`w-full py-3.5 uppercase tracking-[0.08em] text-sm font-medium transition-all duration-300 ${
          isHighlighted
            ? 'bg-[var(--color-rose)] text-[var(--color-black)] hover:bg-[var(--color-rose-hover)]'
            : 'border border-[var(--color-black)] text-[var(--color-black)] hover:bg-[var(--color-black)] hover:text-white'
        }`}
      >
        <span className="tr" data-pt={`Assinar ${plan.namePt}`} data-en={`Get ${plan.nameEn}`}>
          {currentLang === 'pt' ? `Assinar ${plan.namePt}` : `Get ${plan.nameEn}`}
        </span>
      </button>
    </div>
  );
}

export default function PricingSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();
  const plans = usePlanos();
  const [billing, setBilling] = useState<Billing>('monthly');
  const { currentLang } = useLanguage();
  // Só mostra o seletor se algum plano tiver desconto anual configurado;
  // com anual == mensal ele não oferece nada e só polui a tela.
  const temAnual = plans.some(
    (p) => p.id !== 'avulso' && annualConfigured(p.priceMonthly, p.priceAnnual)
  );
  return (
    <section
      id="planos"
      style={{ background: 'var(--color-warm-grey)', padding: 'var(--section-padding) var(--page-padding)' }}
    >
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <div
          ref={headerRef}
          className={`text-center mb-12 ${headerVisible ? 'reveal-visible' : ''} reveal-pattern-a`}
        >
          <span className="uppercase tracking-[0.12em] text-xs font-medium" style={{ color: 'var(--color-rose)' }}>
            <span className="tr" data-pt="ESCOLHA SEU PLANO" data-en="CHOOSE YOUR PLAN">
              ESCOLHA SEU PLANO
            </span>
          </span>
          <h2
            className="mt-4 text-[var(--color-black)] uppercase font-bold leading-[0.9] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}
          >
            <span className="tr" data-pt="Invista na sua melhor versão" data-en="Invest in your best self">
              Invista na sua melhor versão
            </span>
          </h2>
        </div>

        {temAnual && (
          <div className="mb-10 flex justify-center">
            <div
              className="inline-flex rounded-full p-1"
              style={{ background: 'rgba(10,10,10,0.06)' }}
              role="group"
              aria-label={currentLang === 'pt' ? 'Período de cobrança' : 'Billing period'}
            >
              {(['monthly', 'annual'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  aria-pressed={billing === b}
                  className={`rounded-full px-6 py-2 text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-300 ${
                    billing === b
                      ? 'bg-[var(--color-black)] text-white'
                      : 'text-[var(--color-medium-grey)] hover:text-[var(--color-black)]'
                  }`}
                >
                  {b === 'monthly'
                    ? currentLang === 'pt'
                      ? 'Mensal'
                      : 'Monthly'
                    : currentLang === 'pt'
                      ? 'Anual'
                      : 'Annual'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} billing={billing} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-10 mt-12">
          <div className="flex items-center gap-2 text-[var(--color-medium-grey)]">
            <Shield size={20} strokeWidth={1.5} />
            <span className="uppercase tracking-[0.08em] text-xs font-medium">
              <span className="tr" data-pt="Pagamento Seguro" data-en="Secure Payment">Pagamento Seguro</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-medium-grey)]">
            <XCircle size={20} strokeWidth={1.5} />
            <span className="uppercase tracking-[0.08em] text-xs font-medium">
              <span className="tr" data-pt="Cancele Quando Quiser" data-en="Cancel Anytime">Cancele Quando Quiser</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
