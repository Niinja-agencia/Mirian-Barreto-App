import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useHeroParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const content = contentRef.current;

    if (!container || !video || !overlay || !content) return;

    const ctx = gsap.context(() => {
      // Video layer - slowest
      gsap.to(video, {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Overlay - medium
      gsap.to(overlay, {
        opacity: 0.95,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: '50% top',
          scrub: true,
        },
      });

      // Content - faster
      gsap.to(content, {
        yPercent: 30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: '40% top',
          scrub: true,
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return { containerRef, videoRef, overlayRef, contentRef };
}
