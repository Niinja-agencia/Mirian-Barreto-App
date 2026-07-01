import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import { Plus } from 'lucide-react';

const faqItems = [
  {
    questionPt: 'Como funciona o aplicativo?',
    questionEn: 'How does the app work?',
    answerPt: 'Após assinar, você recebe acesso imediato ao app pelo seu celular. Lá você encontra seus treinos do dia, videoaulas, acompanhamento de progresso e pode entrar em contato direto com a Mirian. Tudo organizado e fácil de usar.',
    answerEn: "After subscribing, you get immediate app access on your phone. There you'll find your daily workouts, video classes, progress tracking and can contact Mirian directly. Everything organized and easy to use.",
  },
  {
    questionPt: 'Preciso de equipamento para treinar?',
    questionEn: 'Do I need equipment to train?',
    answerPt: 'Não! A Mirian monta treinos para todos os perfis — com ou sem equipamento, em casa ou na academia. Você escolhe o que funciona melhor para você.',
    answerEn: 'No! Mirian designs workouts for all profiles — with or without equipment, at home or at the gym. You choose what works best for you.',
  },
  {
    questionPt: 'Posso cancelar a qualquer momento?',
    questionEn: 'Can I cancel anytime?',
    answerPt: 'Sim, você pode cancelar sua assinatura quando quiser, sem multa nem burocracia. Acesso continua até o final do período pago.',
    answerEn: 'Yes, you can cancel your subscription anytime, with no penalty or bureaucracy. Access continues until the end of the paid period.',
  },
  {
    questionPt: 'E se eu for iniciante?',
    questionEn: "What if I'm a beginner?",
    answerPt: 'O app tem programas específicos para iniciantes, com exercícios progressivos que evoluem conforme você ganha condicionamento.',
    answerEn: 'The app has specific programs for beginners, with progressive exercises that evolve as you gain conditioning.',
  },
  {
    questionPt: 'O app funciona offline?',
    questionEn: 'Does the app work offline?',
    answerPt: 'Com os planos Premium e VIP, você pode baixar as videoaulas para assistir offline. Perfeito para treinar em lugares sem internet.',
    answerEn: 'With Premium and VIP plans, you can download video classes to watch offline. Perfect for training in places without internet.',
  },
  {
    questionPt: 'Em quanto tempo vejo resultados?',
    questionEn: 'How soon will I see results?',
    answerPt: 'Cada pessoa é diferente, mas nossas alunas costumam sentir diferença já na primeira semana e ver resultados visíveis em 30 a 60 dias de treino consistente.',
    answerEn: 'Every person is different, but our students usually feel a difference in the first week and see visible results in 30 to 60 days of consistent training.',
  },
];

function FAQItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: (typeof faqItems)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  const { currentLang } = useLanguage();

  return (
    <div
      ref={ref}
      className={`${isVisible ? 'reveal-visible' : ''} reveal-pattern-a stagger-${Math.min(index + 1, 7)}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left border-b border-[var(--color-divider)] hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-300 px-4 -mx-4 rounded"
        aria-expanded={isOpen}
      >
        <span className="text-white font-semibold text-base pr-4">
          {currentLang === 'pt' ? item.questionPt : item.questionEn}
        </span>
        <Plus
          size={24}
          className={`faq-icon text-[var(--color-medium-grey)] flex-shrink-0 ${isOpen ? 'open' : ''}`}
        />
      </button>
      <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
        <p className="text-[rgba(255,255,255,0.7)] font-light leading-relaxed pb-6 pt-2 text-sm lg:text-base">
          {currentLang === 'pt' ? item.answerPt : item.answerEn}
        </p>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      style={{
        background: 'var(--color-black)',
        padding: 'var(--section-padding) var(--page-padding)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerVisible ? 'reveal-visible' : ''} reveal-pattern-a`}
        >
          <span
            className="uppercase tracking-[0.12em] text-xs font-medium"
            style={{ color: 'var(--color-rose-light)' }}
          >
            <span className="tr" data-pt="DÚVIDAS" data-en="FAQ">
              DÚVIDAS
            </span>
          </span>
          <h2
            className="mt-4 text-white uppercase font-bold leading-[0.9] tracking-[-0.02em]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 4.5rem)',
            }}
          >
            <span className="tr" data-pt="Perguntas Frequentes" data-en="Frequently Asked Questions">
              Perguntas Frequentes
            </span>
          </h2>
        </div>

        {/* FAQ List */}
        <div>
          {faqItems.map((item, index) => (
            <FAQItem
              key={item.questionPt}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
