import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutSection() {
  const { ref: imgRef, isVisible: imgVisible } = useScrollReveal();
  const { ref: textRef, isVisible: textVisible } = useScrollReveal();
  const { currentLang } = useLanguage();

  const stats = [
    { value: '+10', labelPt: 'anos de experiência', labelEn: 'years of experience' },
    { value: '+10k', labelPt: 'mulheres treinadas', labelEn: 'women trained' },
    { value: '4.9★', labelPt: 'avaliação no app', labelEn: 'app rating' },
  ];

  return (
    <section
      id="sobre"
      className="relative bg-[var(--color-black)]"
      style={{ padding: 'var(--section-padding) var(--page-padding)' }}
    >
      <div className="mx-auto" style={{ maxWidth: 1440 }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div
            ref={imgRef}
            className={`lg:col-span-5 ${imgVisible ? 'reveal-visible' : ''} reveal-pattern-c-left`}
          >
            <div
              className="relative overflow-hidden rounded-lg"
              style={{ aspectRatio: '3 / 4' }}
            >
              <img
                src="/assets/mirian.jpg"
                alt="Mirian Barreto"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Subtle gradient at bottom for depth */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to top, rgba(10,10,10,0.4) 0%, transparent 35%)',
                }}
              />
            </div>
          </div>

          {/* Text */}
          <div
            ref={textRef}
            className={`lg:col-span-7 ${textVisible ? 'reveal-visible' : ''} reveal-pattern-a`}
          >
            <span
              className="uppercase tracking-[0.12em] text-sm font-medium"
              style={{ color: 'var(--color-rose)' }}
            >
              <span className="tr" data-pt="QUEM É MIRIAN" data-en="WHO IS MIRIAN">
                QUEM É MIRIAN
              </span>
            </span>

            <h2
              className="mt-4 text-white font-bold leading-[0.95] tracking-[-0.02em] uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3.75rem)',
              }}
            >
              <span
                className="tr"
                data-pt="Volte a se sentir bem no seu corpo"
                data-en="Feel good in your body again"
              >
                Volte a se sentir bem no seu corpo
              </span>
            </h2>

            <div className="mt-8 space-y-5">
              <p
                className="text-[rgba(255,255,255,0.8)] font-light leading-relaxed"
                style={{ fontSize: 'clamp(1.0625rem, 1.5vw, 1.2rem)' }}
              >
                <span
                  className="tr"
                  data-pt="Sou Mirian Barreto, profissional de Educação Física e apaixonada por ajudar mulheres a conquistarem um corpo forte, saudável e confiante."
                  data-en="I'm Mirian Barreto, a Physical Education professional passionate about helping women build a strong, healthy and confident body."
                >
                  Sou Mirian Barreto, profissional de Educação Física e apaixonada
                  por ajudar mulheres a conquistarem um corpo forte, saudável e
                  confiante.
                </span>
              </p>

              <p
                className="text-[rgba(255,255,255,0.7)] font-light leading-relaxed"
                style={{ fontSize: 'clamp(1.0625rem, 1.5vw, 1.2rem)' }}
              >
                <span
                  className="tr"
                  data-pt="Treinos guiados para mulheres que querem emagrecer, definir e recuperar a confiança, sem precisar viver dentro da academia."
                  data-en="Guided workouts for women who want to lose weight, tone up and regain confidence — without living inside the gym."
                >
                  Treinos guiados para mulheres que querem emagrecer, definir e
                  recuperar a confiança, sem precisar viver dentro da academia.
                </span>
              </p>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-6 lg:gap-10 border-t border-[rgba(255,255,255,0.1)] pt-8">
              {stats.map((stat) => (
                <div key={stat.value}>
                  <div
                    className="text-white font-bold leading-none"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-2 text-[rgba(255,255,255,0.6)] uppercase tracking-[0.08em] text-xs font-medium leading-tight">
                    <span
                      className="tr"
                      data-pt={stat.labelPt}
                      data-en={stat.labelEn}
                    >
                      {currentLang === 'pt' ? stat.labelPt : stat.labelEn}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div
              className="mt-10 italic text-[rgba(255,255,255,0.5)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}
            >
              — Mirian Barreto
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
