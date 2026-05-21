import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Language } from '@/types';

interface LanguageContextType {
  currentLang: Language;
  toggleLanguage: () => void;
  t: (pt: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLang: 'pt',
  toggleLanguage: () => {},
  t: (pt: string) => pt,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem('mb-lang');
    return (saved as Language) || 'pt';
  });

  useEffect(() => {
    localStorage.setItem('mb-lang', currentLang);
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const toggleLanguage = useCallback(() => {
    // Fade out all translatable elements
    const elements = document.querySelectorAll('.tr');
    elements.forEach((el) => {
      el.classList.add('lang-switching');
    });

    setTimeout(() => {
      setCurrentLang((prev) => (prev === 'pt' ? 'en' : 'pt'));
      setTimeout(() => {
        elements.forEach((el) => {
          el.classList.remove('lang-switching');
          el.classList.add('lang-switched');
        });
        setTimeout(() => {
          elements.forEach((el) => {
            el.classList.remove('lang-switched');
          });
        }, 300);
      }, 50);
    }, 200);
  }, []);

  const t = useCallback(
    (pt: string, en: string) => (currentLang === 'pt' ? pt : en),
    [currentLang]
  );

  return (
    <LanguageContext.Provider value={{ currentLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
