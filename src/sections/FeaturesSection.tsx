import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';

const features = [
  {
    eyebrowPt: '01 — VIDEOAULAS',
    eyebrowEn: '01 — VIDEO CLASSES',
    titlePt: 'Aula particular no seu bolso',
    titleEn: 'Private class in your pocket',
    descPt: 'Mais de 500 videoaulas gravadas com instrução detalhada. Cada exercício explicado passo a passo, como se a Mirian estivesse do seu lado.',
    descEn: 'Over 500 video classes with detailed instruction. Each exercise explained step by step, as if Mirian was by your side.',
    tagsPt: ['HD', 'Download Offline', 'Categorias'],
    tagsEn: ['HD', 'Download Offline', 'Categories'],
    image: '/assets/app-mockup-1.jpg',
    imageAlt: 'App videoaulas',
    imageFirst: true,
  },
  {
    eyebrowPt: '02 — PERSONALIZADO',
    eyebrowEn: '02 — PERSONALIZED',
    titlePt: 'Treinos feitos para você',
    titleEn: 'Workouts made for you',
    descPt: 'Programas adaptados ao seu nível, objetivo e disponibilidade. Emagrecimento, ganho de massa, definição ou condicionamento — a Mirian monta seu plano.',
    descEn: 'Programs adapted to your level, goal and availability. Weight loss, muscle gain, definition or conditioning — Mirian builds your plan.',
    tagsPt: ['Iniciante a Avançado', 'Por Objetivo', 'Atualização Mensal'],
    tagsEn: ['Beginner to Advanced', 'By Goal', 'Monthly Updates'],
    image: '/assets/app-mockup-2.jpg',
    imageAlt: 'App treinos personalizados',
    imageFirst: false,
  },
  {
    eyebrowPt: '03 — ACOMPANHAMENTO',
    eyebrowEn: '03 — COACHING',
    titlePt: 'Seu progresso, em tempo real',
    titleEn: 'Your progress, in real time',
    descPt: 'Acompanhe seu desempenho, histórico de treinos, medidas e evolução fotográfica. A Mirian acessa seus dados e ajusta seu programa quando necessário.',
    descEn: 'Track your performance, workout history, measurements and photo evolution. Mirian accesses your data and adjusts your program when needed.',
    tagsPt: ['Estatísticas', 'Fotos de Progresso', 'Suporte Direto'],
    tagsEn: ['Statistics', 'Progress Photos', 'Direct Support'],
    image: '/assets/app-mockup-3.jpg',
    imageAlt: 'App acompanhamento',
    imageFirst: true,
  },
];

function FeatureBlock({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref: textRef, isVisible: textVisible } = useScrollReveal();
  const { ref: imgRef, isVisible: imgVisible } = useScrollReveal();
  const { currentLang } = useLanguage();

  const isImageFirst = feature.imageFirst;

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
        index > 0 ? 'mt-24 lg:mt-32' : ''
      }`}
    >
      {/* Image */}
      <div
        ref={imgRef}
        className={`${isImageFirst ? 'lg:order-1' : 'lg:order-2'} ${
          imgVisible ? 'reveal-visible' : ''
        } ${isImageFirst ? 'reveal-pattern-c-left' : 'reveal-pattern-c-right'}`}
      >
        <div className="rounded-lg overflow-hidden shadow-2xl">
          <img
            src={feature.image}
            alt={feature.imageAlt}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      </div>

      {/* Text Content */}
      <div
        ref={textRef}
        className={`${isImageFirst ? 'lg:order-2' : 'lg:order-1'} ${
          textVisible ? 'reveal-visible' : ''
        } reveal-pattern-a`}
      >
        <span
          className="uppercase tracking-[0.12em] text-sm font-medium"
          style={{ color: 'var(--color-rose)' }}
        >
          {currentLang === 'pt' ? feature.eyebrowPt : feature.eyebrowEn}
        </span>

        <h3
          className="mt-4 font-semibold leading-tight text-[var(--color-black)]"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.875rem, 3.2vw, 2.75rem)',
          }}
        >
          {currentLang === 'pt' ? feature.titlePt : feature.titleEn}
        </h3>

        <p className="mt-5 text-[var(--color-medium-grey)] font-light leading-relaxed" style={{ fontSize: 'clamp(1.0625rem, 1.5vw, 1.2rem)' }}>
          {currentLang === 'pt' ? feature.descPt : feature.descEn}
        </p>

        <div className="flex flex-wrap gap-2 mt-6">
          {(currentLang === 'pt' ? feature.tagsPt : feature.tagsEn).map((tag) => (
            <span
              key={tag}
              className="bg-[rgba(10,10,10,0.05)] px-3 py-1.5 rounded text-sm uppercase tracking-[0.08em] font-medium text-[var(--color-black)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();

  return (
    <section
      id="app"
      style={{
        background: 'var(--color-warm-grey)',
        padding: 'var(--section-padding) var(--page-padding)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1440 }}>
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerVisible ? 'reveal-visible' : ''} reveal-pattern-a`}
        >
          <span
            className="uppercase tracking-[0.12em] text-sm font-medium"
            style={{ color: 'var(--color-rose)' }}
          >
            <span className="tr" data-pt="O APLICATIVO" data-en="THE APP">
              O APLICATIVO
            </span>
          </span>
        </div>

        {/* Feature Blocks */}
        {features.map((feature, index) => (
          <FeatureBlock key={feature.eyebrowPt} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}
