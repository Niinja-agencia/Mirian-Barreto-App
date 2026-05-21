import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import { Check, Shield, RotateCcw, XCircle } from 'lucide-react';

const plans = [
  {
    id: 'basic',
    namePt: 'Básico',
    nameEn: 'Basic',
    descPt: 'Perfeito para começar',
    descEn: 'Perfect to get started',
    monthlyPrice: 'R$29',
    annualPrice: 'R$279',
    monthlyEquiv: '~R$23/mês',
    annualEquiv: '~$7/mo',
    featuresPt: [
      'Acesso a 100+ videoaulas',
      'Treinos atualizados mensalmente',
      'Suporte via comunidade',
    ],
    featuresEn: [
      'Access to 100+ video classes',
      'Monthly updated workouts',
      'Community support',
    ],
    highlighted: false,
  },
  {
    id: 'premium',
    namePt: 'Premium',
    nameEn: 'Premium',
    descPt: 'O favorito das alunas',
    descEn: "The students' favorite",
    monthlyPrice: 'R$59',
    annualPrice: 'R$567',
    monthlyEquiv: '~R$47/mês',
    annualEquiv: '~$15/mo',
    featuresPt: [
      'Acesso ilimitado a todas as videoaulas',
      'Treinos personalizados',
      'Acompanhamento de progresso',
      'Suporte direto com a Mirian',
      'Download offline',
    ],
    featuresEn: [
      'Unlimited access to all video classes',
      'Personalized workouts',
      'Progress tracking',
      'Direct support from Mirian',
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
    monthlyPrice: 'R$99',
    annualPrice: 'R$950',
    monthlyEquiv: '~R$79/mês',
    annualEquiv: '~$23/mo',
    featuresPt: [
      'Tudo do Premium',
      'Consultoria nutricional mensal',
      'Videochamada trimestral',
      'Plano totalmente individualizado',
      'Prioridade no suporte',
    ],
    featuresEn: [
      'Everything in Premium',
      'Monthly nutrition consulting',
      'Quarterly video call',
      'Fully individualized plan',
      'Priority support',
    ],
    highlighted: false,
  },
];

function PricingCard({
  plan,
  billing,
  index,
}: {
  plan: (typeof plans)[0];
  billing: 'monthly' | 'annual';
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  const { currentLang } = useLanguage();
  const isHighlighted = plan.highlighted;

  return (
    <div
      ref={ref}
      className={`pricing-card ${isHighlighted ? 'pricing-card-highlighted' : ''} relative rounded-2xl p-8 lg:p-10 ${
        isVisible ? 'reveal-visible' : ''
      } reveal-pattern-a stagger-${index + 1}`}
      style={{
        background: isHighlighted ? 'var(--color-black)' : 'white',
        border: isHighlighted
          ? '1px solid rgba(233, 30, 99, 0.3)'
          : '1px solid var(--color-divider-dark)',
      }}
    >
      {/* Badge */}
      {isHighlighted && (
        <div className="badge-glow absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-rose)] text-white uppercase tracking-[0.08em] text-xs font-medium px-4 py-1.5">
          <span className="tr" data-pt="MAIS POPULAR" data-en="MOST POPULAR">
            MAIS POPULAR
          </span>
        </div>
      )}

      {/* Plan Name */}
      <h3
        className={`font-semibold ${isHighlighted ? 'text-white' : 'text-[var(--color-black)]'}`}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
        }}
      >
        {currentLang === 'pt' ? plan.namePt : plan.nameEn}
      </h3>

      {/* Price */}
      <div className="mt-4 flex items-baseline gap-1">
        <span
          className={`font-bold leading-none ${isHighlighted ? 'text-white' : 'text-[var(--color-black)]'}`}
          style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}
        >
          {billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
        </span>
        {billing === 'monthly' ? (
          <span className={`text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--color-medium-grey)]'}`}>
            <span className="tr" data-pt="/mês" data-en="/mo">/mês</span>
          </span>
        ) : (
          <span className={`text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--color-medium-grey)]'}`}>
            {currentLang === 'pt' ? plan.monthlyEquiv : plan.annualEquiv}
          </span>
        )}
      </div>

      {/* Description */}
      <p className={`mt-2 text-sm ${isHighlighted ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--color-medium-grey)]'}`}>
        {currentLang === 'pt' ? plan.descPt : plan.descEn}
      </p>

      {/* Divider */}
      <div
        className={`my-6 h-px ${isHighlighted ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-[var(--color-divider-dark)]'}`}
      />

      {/* Features */}
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

      {/* CTA */}
      <button
        className={`w-full py-3.5 uppercase tracking-[0.08em] text-sm font-medium transition-all duration-300 ${
          isHighlighted
            ? 'bg-[var(--color-rose)] text-[var(--color-black)] hover:bg-[var(--color-rose-hover)]'
            : 'border border-[var(--color-black)] text-[var(--color-black)] hover:bg-[var(--color-black)] hover:text-white'
        }`}
      >
        <span className="tr" data-pt={`Assinar ${plan.namePt}`} data-en={`Subscribe ${plan.nameEn}`}>
          {currentLang === 'pt' ? `Assinar ${plan.namePt}` : `Subscribe ${plan.nameEn}`}
        </span>
      </button>
    </div>
  );
}

export default function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();
  return (
    <section
      id="planos"
      style={{
        background: 'var(--color-warm-grey)',
        padding: 'var(--section-padding) var(--page-padding)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-4 ${headerVisible ? 'reveal-visible' : ''} reveal-pattern-a`}
        >
          <span
            className="uppercase tracking-[0.12em] text-xs font-medium"
            style={{ color: 'var(--color-rose)' }}
          >
            <span className="tr" data-pt="ESCOLHA SEU PLANO" data-en="CHOOSE YOUR PLAN">
              ESCOLHA SEU PLANO
            </span>
          </span>
          <h2
            className="mt-4 text-[var(--color-black)] uppercase font-bold leading-[0.9] tracking-[-0.02em]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 4.5rem)',
            }}
          >
            <span className="tr" data-pt="Invista no seu melhor versão" data-en="Invest in your best self">
              Invista no seu melhor versão
            </span>
          </h2>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span
            className={`text-sm font-medium ${billing === 'monthly' ? 'text-[var(--color-black)]' : 'text-[var(--color-medium-grey)]'}`}
          >
            <span className="tr" data-pt="Mensal" data-en="Monthly">Mensal</span>
          </span>

          <button
            onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-12 h-6 rounded-full bg-[rgba(10,10,10,0.15)] cursor-pointer"
            aria-label="Alternar entre mensal e anual"
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-[var(--color-rose)] transition-all duration-300"
              style={{ left: billing === 'annual' ? 26 : 2 }}
            />
          </button>

          <span
            className={`text-sm font-medium flex items-center gap-2 ${billing === 'annual' ? 'text-[var(--color-black)]' : 'text-[var(--color-medium-grey)]'}`}
          >
            <span className="tr" data-pt="Anual" data-en="Annual">Anual</span>
            <span className="bg-[var(--color-rose)] text-white text-xs uppercase tracking-[0.08em] font-medium px-2 py-0.5 rounded">
              -20%
            </span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} billing={billing} index={index} />
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-10 mt-12">
          <div className="flex items-center gap-2 text-[var(--color-medium-grey)]">
            <Shield size={20} strokeWidth={1.5} />
            <span className="uppercase tracking-[0.08em] text-xs font-medium">
              <span className="tr" data-pt="Pagamento Seguro" data-en="Secure Payment">Pagamento Seguro</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-medium-grey)]">
            <RotateCcw size={20} strokeWidth={1.5} />
            <span className="uppercase tracking-[0.08em] text-xs font-medium">
              <span className="tr" data-pt="7 Dias de Garantia" data-en="7-Day Guarantee">7 Dias de Garantia</span>
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
