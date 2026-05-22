import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Phone, Instagram } from 'lucide-react';

export default function CTAFinalSection() {
  const { ref, isVisible } = useScrollReveal();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 96;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'var(--color-black)',
        padding: '120px var(--page-padding)',
      }}
    >
      {/* Rose Glow Background */}
      <div
        className="absolute inset-0 rose-glow-pulse pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(233,30,99,0.15) 0%, transparent 70%)',
        }}
      />

      <div
        ref={ref}
        className={`relative z-10 text-center mx-auto ${isVisible ? 'reveal-visible' : ''} reveal-pattern-b`}
        style={{ maxWidth: 700 }}
      >
        {/* Headline */}
        <h2
          className="text-white uppercase font-bold leading-[0.9] tracking-[-0.02em]"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 4.5rem)',
          }}
        >
          <span className="tr" data-pt="Sua melhor versão está a um clique" data-en="Your best self is one click away">
            Sua melhor versão está a um clique
          </span>
        </h2>

        {/* Subtext */}
        <p className="mt-4 text-[rgba(255,255,255,0.7)] font-light leading-relaxed" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>
          <span
            className="tr"
            data-pt="Milhares de mulheres já transformaram seus corpos e suas vidas. Chegou a sua vez."
            data-en="Thousands of women have already transformed their bodies and lives. It's your turn."
          >
            Milhares de mulheres já transformaram seus corpos e suas vidas. Chegou a sua vez.
          </span>
        </p>

        {/* CTA */}
        <button
          onClick={() => scrollToSection('planos')}
          className="cta-btn cta-btn-lg bg-[var(--color-rose)] text-[var(--color-black)] uppercase tracking-[0.08em] text-sm font-medium px-10 py-4.5 mt-10 inline-block"
          style={{ padding: '18px 40px' }}
        >
          <span className="tr" data-pt="Começar Minha Transformação" data-en="Start My Transformation">
            Começar Minha Transformação
          </span>
        </button>

        {/* Contact Info */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mt-12">
          <a
            href="https://wa.me/553191809387"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[var(--color-medium-grey)] hover:text-white transition-colors duration-300"
          >
            <Phone size={20} strokeWidth={1.5} />
            <span className="text-sm">31 9180-9387</span>
          </a>
          <a
            href="https://instagram.com/mirianbarretombb"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[var(--color-medium-grey)] hover:text-white transition-colors duration-300"
          >
            <Instagram size={20} strokeWidth={1.5} />
            <span className="text-sm">@mirianbarretombb</span>
          </a>
        </div>

        {/* Mini FAQ Teaser */}
        <p className="mt-8 text-[rgba(255,255,255,0.5)] text-xs uppercase tracking-[0.08em] font-medium">
          <span className="tr" data-pt="Ainda tem dúvidas?" data-en="Still have questions?">
            Ainda tem dúvidas?
          </span>{' '}
          <a
            href="https://wa.me/553191809387"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-rose)] hover:text-[var(--color-rose-hover)] transition-colors duration-300 underline underline-offset-2"
          >
            <span className="tr" data-pt="Fale direto com a Mirian pelo WhatsApp" data-en="Talk directly to Mirian on WhatsApp">
              Fale direto com a Mirian pelo WhatsApp
            </span>
          </a>
        </p>
      </div>
    </section>
  );
}
