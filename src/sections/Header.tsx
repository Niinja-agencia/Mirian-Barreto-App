import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const { currentLang, toggleLanguage } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          isScrolled
            ? 'bg-[rgba(10,10,10,0.9)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)]'
            : 'bg-transparent'
        }`}
        style={{ height: 80 }}
      >
        <div
          className="flex items-center justify-between h-full mx-auto"
          style={{ maxWidth: 1440, padding: '0 var(--page-padding)' }}
        >
          {/* Logo */}
          <button
            onClick={() => scrollToSection('hero')}
            className="text-white font-semibold text-xl tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mirian Barreto
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('sobre')} className="nav-link text-white uppercase tracking-[0.08em] text-sm font-medium">
              <span className="tr" data-pt="Sobre" data-en="About">Sobre</span>
            </button>
            <button onClick={() => scrollToSection('app')} className="nav-link text-white uppercase tracking-[0.08em] text-sm font-medium">
              <span className="tr" data-pt="App" data-en="App">App</span>
            </button>
            <button onClick={() => scrollToSection('planos')} className="nav-link text-white uppercase tracking-[0.08em] text-sm font-medium">
              <span className="tr" data-pt="Planos" data-en="Plans">Planos</span>
            </button>
            <button onClick={() => scrollToSection('faq')} className="nav-link text-white uppercase tracking-[0.08em] text-sm font-medium">
              <span className="tr" data-pt="FAQ" data-en="FAQ">FAQ</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="text-[var(--color-medium-grey)] border border-[rgba(255,255,255,0.2)] px-3 py-1.5 text-xs uppercase tracking-[0.08em] font-medium hover:text-white hover:border-white transition-all duration-300"
              aria-label="Alternar idioma / Switch language"
            >
              {currentLang === 'pt' ? 'EN' : 'PT'}
            </button>

            {/* CTA */}
            <button
              onClick={() => scrollToSection('planos')}
              className="cta-btn bg-[var(--color-rose)] text-[var(--color-black)] uppercase tracking-[0.08em] text-sm font-medium px-6 py-3"
            >
              <span className="tr" data-pt="Quero Começar" data-en="Get Started">Quero Começar</span>
            </button>
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu fixed inset-0 z-[101] bg-[var(--color-black)] flex flex-col items-center justify-center gap-8 md:hidden ${
          isMenuOpen ? 'open' : ''
        }`}
      >
        <button
          className="absolute top-6 right-6 text-white p-2"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={28} />
        </button>

        <button
          onClick={() => scrollToSection('sobre')}
          className="text-white text-3xl font-bold uppercase tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="tr" data-pt="Sobre" data-en="About">Sobre</span>
        </button>
        <button
          onClick={() => scrollToSection('app')}
          className="text-white text-3xl font-bold uppercase tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="tr" data-pt="App" data-en="App">App</span>
        </button>
        <button
          onClick={() => scrollToSection('planos')}
          className="text-white text-3xl font-bold uppercase tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="tr" data-pt="Planos" data-en="Plans">Planos</span>
        </button>
        <button
          onClick={() => scrollToSection('faq')}
          className="text-white text-3xl font-bold uppercase tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="tr" data-pt="FAQ" data-en="FAQ">FAQ</span>
        </button>

        <button
          onClick={toggleLanguage}
          className="text-[var(--color-medium-grey)] border border-[rgba(255,255,255,0.2)] px-4 py-2 text-sm uppercase tracking-[0.08em] font-medium"
        >
          {currentLang === 'pt' ? 'EN' : 'PT'}
        </button>

        <button
          onClick={() => scrollToSection('planos')}
          className="cta-btn bg-[var(--color-rose)] text-[var(--color-black)] uppercase tracking-[0.08em] text-sm font-medium px-8 py-4 mt-4"
        >
          <span className="tr" data-pt="Quero Começar" data-en="Get Started">Quero Começar</span>
        </button>
      </div>
    </>
  );
}
