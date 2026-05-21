import { useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import { Star } from 'lucide-react';

const stats = [
  { value: '+10.000', numericValue: 10000, labelPt: 'Alunas Ativas', labelEn: 'Active Students' },
  { value: '4.9', numericValue: 4.9, labelPt: 'Avaliação no App', labelEn: 'App Rating', hasStars: true },
  { value: '500+', numericValue: 500, labelPt: 'Videoaulas', labelEn: 'Video Classes' },
  { value: '97%', numericValue: 97, labelPt: 'Taxa de Satisfação', labelEn: 'Satisfaction Rate', suffix: '%' },
];

const testimonials = [
  {
    name: 'Ana Carolina',
    durationPt: 'Há 6 meses com a Mirian',
    durationEn: '6 months with Mirian',
    quotePt: 'A Mirian mudou minha relação com o exercício. Antes eu odiava academia, agora não consigo ficar sem treinar!',
    quoteEn: "Mirian changed my relationship with exercise. Before I hated the gym, now I can't go without training!",
    resultPt: '-8kg em 4 meses',
    resultEn: '-8kg in 4 months',
  },
  {
    name: 'Fernanda L.',
    durationPt: 'Há 8 meses com a Mirian',
    durationEn: '8 months with Mirian',
    quotePt: 'O app é super intuitivo. Consigo treinar em casa enquanto minha filha dorme. Melhor investimento que fiz!',
    quoteEn: 'The app is super intuitive. I can train at home while my daughter sleeps. Best investment I ever made!',
    resultPt: '-12kg em 6 meses',
    resultEn: '-12kg in 6 months',
  },
  {
    name: 'Juliana M.',
    durationPt: 'Há 3 meses com a Mirian',
    durationEn: '3 months with Mirian',
    quotePt: 'Em 3 meses já vi resultado que não vi em anos de academia sozinha. A Mirian realmente se importa.',
    quoteEn: "In 3 months I saw results I didn't see in years of gym alone. Mirian truly cares.",
    resultPt: '-6kg em 3 meses',
    resultEn: '-6kg in 3 months',
  },
  {
    name: 'Patricia R.',
    durationPt: 'Há 10 meses com a Mirian',
    durationEn: '10 months with Mirian',
    quotePt: 'Treino de qualquer lugar, até em viagem de trabalho. Não tenho mais desculpa!',
    quoteEn: 'I train from anywhere, even on business trips. No more excuses!',
    resultPt: '-15kg em 8 meses',
    resultEn: '-15kg in 8 months',
  },
  {
    name: 'Camila S.',
    durationPt: 'Há 5 meses com a Mirian',
    durationEn: '5 months with Mirian',
    quotePt: 'Além do físico, ganhei confiança e disciplina. A Mirian é mais que uma PT, é uma mentora.',
    quoteEn: 'Beyond the physical, I gained confidence and discipline. Mirian is more than a PT, she is a mentor.',
    resultPt: '-10kg em 5 meses',
    resultEn: '-10kg in 5 months',
  },
];

function AnimatedCounter({
  target,
  isVisible,
  prefix = '',
  suffix = '',
}: {
  target: number;
  isVisible: boolean;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, target]);

  const displayValue = target === 4.9 ? `${prefix}${(count / 1000).toFixed(1)}` : `${prefix}${count.toLocaleString()}${suffix}`;

  return <span>{displayValue}</span>;
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[0];
}) {
  const { currentLang } = useLanguage();

  return (
    <div
      className="flex-shrink-0 w-[380px] max-sm:w-[300px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-rose)] to-[var(--color-rose-light)] flex items-center justify-center text-white font-bold text-lg border-2 border-[var(--color-rose)]">
          {testimonial.name.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.name}</p>
          <p className="text-[var(--color-medium-grey)] uppercase tracking-[0.08em] text-xs font-medium">
            {currentLang === 'pt' ? testimonial.durationPt : testimonial.durationEn}
          </p>
        </div>
      </div>

      <p className="text-[rgba(255,255,255,0.8)] text-sm leading-[1.7] font-light">
        "{currentLang === 'pt' ? testimonial.quotePt : testimonial.quoteEn}"
      </p>

      <div className="flex items-center gap-1 mt-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className="text-[var(--color-rose)]" fill="var(--color-rose)" />
        ))}
      </div>

      <div className="mt-3">
        <span className="inline-block bg-[rgba(233,30,99,0.15)] text-[var(--color-rose)] text-xs uppercase tracking-[0.08em] font-medium px-2.5 py-1 rounded">
          {currentLang === 'pt' ? testimonial.resultPt : testimonial.resultEn}
        </span>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal(0.1);
  const { currentLang } = useLanguage();

  // Duplicate testimonials for seamless loop
  const allTestimonials = [...testimonials, ...testimonials];

  return (
    <section
      style={{
        background: 'var(--color-black)',
        padding: 'var(--section-padding) var(--page-padding)',
      }}
      className="overflow-hidden"
    >
      <div className="mx-auto" style={{ maxWidth: 1440 }}>
        {/* Section Header */}
        <div
          ref={sectionRef}
          className={`text-center mb-16 ${sectionVisible ? 'reveal-visible' : ''} reveal-pattern-a`}
        >
          <span
            className="uppercase tracking-[0.12em] text-xs font-medium"
            style={{ color: 'var(--color-rose-light)' }}
          >
            <span className="tr" data-pt="RESULTADOS REAIS" data-en="REAL RESULTS">
              RESULTADOS REAIS
            </span>
          </span>
          <h2
            className="mt-4 text-white uppercase font-bold leading-[0.9] tracking-[-0.02em]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 4.5rem)',
            }}
          >
            <span className="tr" data-pt="Transformações que inspiram" data-en="Transformations that inspire">
              Transformações que inspiram
            </span>
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => {
            const { ref, isVisible } = useScrollReveal();
            return (
              <div
                key={stat.labelPt}
                ref={ref}
                className={`text-center ${isVisible ? 'reveal-visible' : ''} reveal-pattern-a stagger-${index + 1}`}
              >
                <div
                  className="text-white font-bold leading-none"
                  style={{
                    fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {stat.hasStars ? (
                    <span>4.9</span>
                  ) : (
                    <AnimatedCounter
                      target={stat.numericValue}
                      isVisible={isVisible}
                      prefix={stat.value.startsWith('+') ? '+' : ''}
                      suffix={stat.suffix || ''}
                    />
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {stat.hasStars &&
                    [...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className="text-[var(--color-rose)]" fill="var(--color-rose)" />
                    ))}
                </div>
                <p className="uppercase tracking-[0.12em] text-xs font-medium text-[var(--color-medium-grey)] mt-2">
                  {currentLang === 'pt' ? stat.labelPt : stat.labelEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Testimonial Carousel */}
      <div className="relative">
        <div className="carousel-track flex gap-6" style={{ width: 'max-content' }}>
          {allTestimonials.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
