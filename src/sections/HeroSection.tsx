import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { useHeroParallax } from '@/hooks/useParallax';
import gsap from 'gsap';
import { ChevronDown } from 'lucide-react';

export default function HeroSection() {
  const { containerRef, videoRef, overlayRef, contentRef } = useHeroParallax();
  const [showScroll, setShowScroll] = useState(true);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Auto-hide scroll indicator
    const timer = setTimeout(() => setShowScroll(false), 5000);
    const handleScroll = () => {
      if (window.scrollY > 50) setShowScroll(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Hero text stagger animation
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });

      textRefs.current.forEach((el, i) => {
        if (el) {
          tl.to(
            el,
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',
            },
            i * 0.2
          );
        }
      });
    });

    return () => ctx.revert();
  }, []);

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
      id="hero"
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: '100vh', minHeight: 600 }}
    >
      {/* Layer 0 — Image Background */}
      <div ref={videoRef} className="absolute inset-0 z-0">
        <img
          src="/assets/hero.jpeg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Layer 1 — Gradient Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-[1]"
        style={{
          background: `
            linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,0.95) 100%),
            radial-gradient(ellipse at 30% 80%, rgba(233,30,99,0.15) 0%, transparent 70%)
          `,
        }}
      />

      {/* Layer 2 — Content */}
      <div
        ref={contentRef}
        className="absolute inset-0 z-[2] flex flex-col justify-end"
        style={{ paddingBottom: '15vh', paddingLeft: 'var(--page-padding)', paddingRight: 'var(--page-padding)' }}
      >
        <div className="max-w-[800px]">
          {/* Eyebrow */}
          <div
            ref={(el) => { textRefs.current[0] = el; }}
            className="opacity-0 translate-y-6"
          >
            <span
              className="uppercase tracking-[0.12em] text-xs font-medium"
              style={{ color: 'var(--color-rose-light)' }}
            >
              APP DE TREINOS • Mirian Barreto
            </span>
          </div>

          {/* Headline */}
          <div
            ref={(el) => { textRefs.current[1] = el; }}
            className="opacity-0 translate-y-6 mt-4"
          >
            <h1
              className="text-white uppercase font-bold leading-[0.85] tracking-[-0.03em]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 8vw, 7rem)',
              }}
            >
              <span className="tr" data-pt="Treinos para mulheres reais" data-en="Workouts for real women">
                Treinos para mulheres reais
              </span>
            </h1>
          </div>

          {/* Subheadline */}
          <div
            ref={(el) => { textRefs.current[2] = el; }}
            className="opacity-0 translate-y-6 mt-6"
          >
            <p
              className="text-[rgba(255,255,255,0.8)] font-light leading-relaxed max-w-[520px]"
              style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}
            >
              <span
                className="tr"
                data-pt="Emagreça, defina e fortaleça seu corpo com treinos práticos que cabem na sua rotina."
                data-en="Lose weight, tone and strengthen your body with practical workouts that fit your routine."
              >
                Emagreça, defina e fortaleça seu corpo com treinos práticos que cabem na sua rotina.
              </span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            ref={(el) => { textRefs.current[3] = el; }}
            className="opacity-0 translate-y-6 mt-10 flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={() => scrollToSection('planos')}
              className="cta-btn bg-[var(--color-rose)] text-[var(--color-black)] uppercase tracking-[0.08em] text-sm font-medium px-8 py-4 text-center"
              aria-label="Começar agora"
            >
              {/* Sem preço aqui de propósito: R$29/mês não era nenhum plano
                  (o mais barato mensal é o Básico). Os valores reais ficam
                  logo abaixo, na seção Planos, vindos do banco. */}
              <span className="tr" data-pt="Comece Agora" data-en="Start Now">
                Comece Agora
              </span>
            </button>
            <button
              onClick={() => scrollToSection('planos')}
              className="border border-white text-white uppercase tracking-[0.08em] text-sm font-medium px-8 py-4 hover:bg-[rgba(255,255,255,0.1)] transition-all duration-300 text-center"
              aria-label="Ver planos"
            >
              <span className="tr" data-pt="Ver Planos" data-en="See Plans">
                Ver Planos
              </span>
            </button>
            <Link
              to="/login"
              className="border border-white text-white uppercase tracking-[0.08em] text-sm font-medium px-8 py-4 hover:bg-[rgba(255,255,255,0.1)] transition-all duration-300 text-center"
              aria-label="Acesso para alunas existentes"
            >
              <span className="tr" data-pt="Já sou aluna" data-en="I'm already a student">
                Já sou aluna
              </span>
            </Link>
          </div>
        </div>

        {/* Social Proof Bar */}
        <div
          ref={(el) => { textRefs.current[4] = el; }}
          className="opacity-0 translate-y-6 absolute bottom-10 right-0 hidden md:flex items-center gap-8"
          style={{ right: 'var(--page-padding)' }}
        >
          <span className="text-white font-semibold text-sm">
            +10.000 <span className="tr" data-pt="alunas" data-en="students">alunas</span>
          </span>
          <div className="w-px h-6 bg-[rgba(255,255,255,0.2)]" />
          <span className="text-[rgba(255,255,255,0.7)] text-sm">
            4.9 ★ <span className="tr" data-pt="no app" data-en="on the app">no app</span>
          </span>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[3] flex flex-col items-center gap-2 transition-opacity duration-500 ${
          showScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } md:flex hidden`}
      >
        <span className="text-[rgba(255,255,255,0.4)] uppercase tracking-[0.08em] text-xs font-medium">
          Scroll
        </span>
        <ChevronDown size={16} className="text-[rgba(255,255,255,0.4)] scroll-bounce" />
      </div>
    </section>
  );
}
