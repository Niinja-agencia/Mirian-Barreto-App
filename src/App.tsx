import { LanguageProvider } from '@/context/LanguageContext';
import Header from '@/sections/Header';
import HeroSection from '@/sections/HeroSection';
import TrustedBySection from '@/sections/TrustedBySection';
import AboutSection from '@/sections/AboutSection';
import FeaturesSection from '@/sections/FeaturesSection';
import TestimonialsSection from '@/sections/TestimonialsSection';
import PricingSection from '@/sections/PricingSection';
import FAQSection from '@/sections/FAQSection';
import CTAFinalSection from '@/sections/CTAFinalSection';
import Footer from '@/sections/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

function App() {
  return (
    <LanguageProvider>
      <Header />
      <main>
        <HeroSection />
        <TrustedBySection />
        <AboutSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTAFinalSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </LanguageProvider>
  );
}

export default App;
