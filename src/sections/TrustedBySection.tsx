import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Heart } from 'lucide-react';

export default function TrustedBySection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className="relative bg-[var(--color-black)]"
      style={{ padding: '40px var(--page-padding)' }}
    >
      <div className="flex items-center gap-6 max-w-[1440px] mx-auto">
        <div className="flex-1 h-px bg-[var(--color-divider)]" />
        <div
          className={`flex items-center gap-3 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Heart size={14} className="text-[var(--color-rose)]" fill="var(--color-rose)" />
          <span className="uppercase tracking-[0.12em] text-xs font-medium text-[var(--color-medium-grey)] whitespace-nowrap">
            <span
              className="tr"
              data-pt="Junte-se a milhares de mulheres que já transformaram seus corpos"
              data-en="Join thousands of women who have already transformed their bodies"
            >
              Junte-se a milhares de mulheres que já transformaram seus corpos
            </span>
          </span>
          <Heart size={14} className="text-[var(--color-rose)]" fill="var(--color-rose)" />
        </div>
        <div className="flex-1 h-px bg-[var(--color-divider)]" />
      </div>
    </div>
  );
}
