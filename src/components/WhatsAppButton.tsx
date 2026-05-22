import { useLanguage } from '@/context/LanguageContext';

// Número da Mirian (formato internacional, só dígitos). Mesmo usado no Footer.
const PHONE_NUMBER = '553191809387';

const MESSAGES = {
  pt: 'Olá! Quero saber mais sobre os treinos com a Mirian.',
  en: "Hi! I'd like to know more about training with Mirian.",
};

export default function WhatsAppButton() {
  const { currentLang } = useLanguage();
  const text = encodeURIComponent(MESSAGES[currentLang]);
  const href = `https://wa.me/${PHONE_NUMBER}?text=${text}`;
  const aria =
    currentLang === 'pt' ? 'Falar no WhatsApp' : 'Chat on WhatsApp';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={aria}
      className="group fixed bottom-5 right-5 md:bottom-7 md:right-7 z-[90] flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-[0_8px_24px_rgba(37,211,102,0.4)] transition-transform duration-300 hover:scale-110 active:scale-95"
      style={{ backgroundColor: '#25D366' }}
    >
      {/* Pulse ring */}
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-40"
        style={{ backgroundColor: '#25D366', animationDuration: '2.5s' }}
        aria-hidden="true"
      />
      {/* Official WhatsApp glyph */}
      <svg
        viewBox="0 0 32 32"
        className="relative w-7 h-7 md:w-8 md:h-8 fill-white"
        aria-hidden="true"
      >
        <path d="M16.003 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.257.59 4.466 1.713 6.41L3.2 28.8l6.55-1.713a12.768 12.768 0 0 0 6.252 1.6h.005c7.07 0 12.8-5.73 12.8-12.8 0-3.42-1.33-6.633-3.747-9.05A12.74 12.74 0 0 0 16.003 3.2zm0 23.36h-.004a10.61 10.61 0 0 1-5.41-1.481l-.388-.23-4.03 1.054 1.075-3.927-.253-.404a10.6 10.6 0 0 1-1.626-5.652c0-5.86 4.77-10.624 10.636-10.624 2.84 0 5.51 1.107 7.517 3.117a10.564 10.564 0 0 1 3.115 7.515c0 5.86-4.77 10.624-10.632 10.624zm5.83-7.954c-.32-.16-1.89-.933-2.183-1.04-.293-.107-.507-.16-.72.16-.213.32-.827 1.04-1.013 1.253-.187.213-.373.24-.693.08-.32-.16-1.35-.498-2.572-1.587-.95-.847-1.59-1.893-1.777-2.213-.187-.32-.02-.493.14-.653.144-.144.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.733-.986-2.373-.26-.624-.523-.539-.72-.549l-.613-.011a1.18 1.18 0 0 0-.853.4c-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.146 3.093 1.306 3.307.16.213 2.253 3.44 5.46 4.823.763.33 1.358.527 1.822.673.766.243 1.463.21 2.014.128.614-.092 1.89-.773 2.157-1.52.266-.747.266-1.387.187-1.52-.08-.133-.293-.213-.613-.373z" />
      </svg>
    </a>
  );
}
