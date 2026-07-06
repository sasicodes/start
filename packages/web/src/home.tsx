import Lenis from 'lenis';
import { useCallback, useEffect, useRef } from 'react';
import { Landing } from '@/components/retro/landing';
import { Showcase } from '@/components/retro/showcase';
import { Footer } from '@/footer';
import { Rails } from '@/rails';
import { useVisible } from '@/use-visible';

export const Home = () => {
  const isVisible = useVisible();
  const rafId = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);

  const startLoop = useCallback(() => {
    if (rafId.current) return;

    const raf = (time: number) => {
      const lenis = lenisRef.current;
      if (!lenis) {
        rafId.current = 0;
        return;
      }

      lenis.raf(time);
      rafId.current = requestAnimationFrame(raf);
    };
    rafId.current = requestAnimationFrame(raf);
  }, []);

  const stopLoop = useCallback(() => {
    if (!rafId.current) return;

    cancelAnimationFrame(rafId.current);
    rafId.current = 0;
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.8,
      smoothWheel: true,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t))
    });
    lenisRef.current = lenis;
    startLoop();
    return () => {
      stopLoop();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [startLoop, stopLoop]);

  useEffect(() => {
    if (!isVisible) {
      stopLoop();
      return;
    }
    startLoop();
  }, [isVisible, startLoop, stopLoop]);

  return (
    <div className="w-full bg-retro-cream relative">
      <Rails />
      <section className="w-full h-dvh md:h-auto flex-1 flex flex-col gap-8 sm:gap-10 sm:justify-around sm:py-24">
        <Landing />
      </section>
      <div className="py-40">
        <Showcase />
      </div>
      <Footer />
    </div>
  );
};
