import { useLanguage } from '@/context/LanguageContext';
import { Instagram, Youtube, Phone, ArrowRight } from 'lucide-react';
import { whatsappDisplay, whatsappLink } from '@/lib/contato';

export default function Footer() {
  const { currentLang } = useLanguage();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 96;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <footer
      style={{
        background: 'var(--color-black)',
        padding: '80px var(--page-padding) 40px',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1440 }}>
        {/* Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div>
            <img
              src="/assets/logo-mirian.png"
              alt="Mirian Barreto"
              className="h-16 w-auto"
            />
            <p className="mt-4 text-[var(--color-medium-grey)] font-light text-sm leading-relaxed">
              <span className="tr" data-pt="Transforme seu corpo. Treine de qualquer lugar." data-en="Transform your body. Train from anywhere.">
                Transforme seu corpo. Treine de qualquer lugar.
              </span>
            </p>
          </div>

          {/* Links Column */}
          <div>
            <h4 className="uppercase tracking-[0.12em] text-xs font-medium text-white mb-4">
              <span className="tr" data-pt="Links" data-en="Links">Links</span>
            </h4>
            <ul className="space-y-3">
              {[
                { pt: 'Início', en: 'Home', id: 'hero' },
                { pt: 'O App', en: 'The App', id: 'app' },
                { pt: 'Planos', en: 'Plans', id: 'planos' },
                { pt: 'FAQ', en: 'FAQ', id: 'faq' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-[var(--color-medium-grey)] hover:text-white transition-colors duration-300 text-sm font-light"
                  >
                    {currentLang === 'pt' ? link.pt : link.en}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Column */}
          <div>
            <h4 className="uppercase tracking-[0.12em] text-xs font-medium text-white mb-4">
              <span className="tr" data-pt="Redes Sociais" data-en="Social Media">Redes Sociais</span>
            </h4>
            <div className="flex items-center gap-4 mb-4">
              <a
                href="https://instagram.com/mirianbarretombb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-medium-grey)] hover:text-[var(--color-rose)] transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram size={24} strokeWidth={1.5} />
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-medium-grey)] hover:text-[var(--color-rose)] transition-colors duration-300"
                aria-label="WhatsApp"
              >
                <Phone size={24} strokeWidth={1.5} />
              </a>
              <a
                href="#"
                className="text-[var(--color-medium-grey)] hover:text-[var(--color-rose)] transition-colors duration-300"
                aria-label="YouTube"
              >
                <Youtube size={24} strokeWidth={1.5} />
              </a>
            </div>
            <p className="uppercase tracking-[0.08em] text-xs font-medium text-[var(--color-medium-grey)]">
              @mirianbarretombb
            </p>
            <p className="uppercase tracking-[0.08em] text-xs font-medium text-[var(--color-medium-grey)] mt-1">
              {whatsappDisplay()}
            </p>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="uppercase tracking-[0.12em] text-xs font-medium text-white mb-4">
              <span className="tr" data-pt="Receba dicas exclusivas" data-en="Get exclusive tips">Receba dicas exclusivas</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={currentLang === 'pt' ? 'Seu email' : 'Your email'}
                className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm px-4 py-3 outline-none focus:border-white transition-colors duration-300 placeholder:text-[var(--color-medium-grey)]"
              />
              <button
                className="bg-[var(--color-rose)] text-[var(--color-black)] px-4 py-3 hover:bg-[var(--color-rose-hover)] transition-colors duration-300"
                aria-label="Enviar"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[var(--color-divider)] pt-8 mt-16 gap-4">
          <p className="uppercase tracking-[0.08em] text-xs font-medium text-[var(--color-medium-grey)]">
            © 2026 Mirian Barreto. <span className="tr" data-pt="Todos os direitos reservados." data-en="All rights reserved.">Todos os direitos reservados.</span>
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="uppercase tracking-[0.08em] text-xs font-medium text-[var(--color-medium-grey)] hover:text-white transition-colors duration-300">
              <span className="tr" data-pt="Termos de Uso" data-en="Terms of Use">Termos de Uso</span>
            </a>
            <span className="text-[var(--color-divider)]">|</span>
            <a href="#" className="uppercase tracking-[0.08em] text-xs font-medium text-[var(--color-medium-grey)] hover:text-white transition-colors duration-300">
              <span className="tr" data-pt="Política de Privacidade" data-en="Privacy Policy">Política de Privacidade</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
