import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import { Check, Shield, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { brl } from '@/lib/format';

interface PricingPlan {
  id: string;
  namePt: string;
  nameEn: string;
  descPt: string;
  descEn: string;
  price: string;
  pricePt: string;
  priceEn: string;
  featuresPt: string[];
  featuresEn: string[];
  highlighted: boolean;
}

function PricingCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const { ref, isVisible } = useScrollReveal();
  const { currentLang } = useLanguage();
  const navigate = useNavigate();
  const isHighlighted = plan.highlighted;

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
          {plan.price}
        </span>
        <span className={`text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--color-medium-grey)]'}`}>
          <span className="tr" data-pt={plan.pricePt} data-en={plan.priceEn}>
            {currentLang === 'pt' ? plan.pricePt : plan.priceEn}
          </span>
        </span>
      </div>

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
        onClick={() => navigate(`/checkout/${plan.id}`)}
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
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.from('plans').select('*').eq('active', true).order('sort_order').then(({ data }) => {
      if (!active) return;
      setPlans((data ?? []).map((plan) => ({
        id: plan.slug,
        namePt: plan.name_pt,
        nameEn: plan.name_en,
        descPt: plan.description_pt ?? '',
        descEn: plan.description_en ?? '',
        price: brl(Number(plan.price_monthly)),
        pricePt: plan.slug === 'avulso' ? 'único' : '/mês',
        priceEn: plan.slug === 'avulso' ? 'one-time' : '/mo',
        featuresPt: plan.features_pt,
        featuresEn: plan.features_en,
        highlighted: plan.highlighted,
      })));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>
        {loading && <p className="text-center text-[var(--color-medium-grey)]">Carregando planos…</p>}
        {!loading && plans.length === 0 &&
          <p className="text-center text-[var(--color-medium-grey)]">Planos indisponíveis no momento. Tente novamente em instantes.</p>}

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
