import Lenis from 'lenis';
import { useCallback, useEffect, useRef } from 'react';
import { RetroLanding } from '@/components/retro/landing';
import { ModelLinks } from '@/components/retro/model-links';
import { Showcase } from '@/components/retro/showcase';
import { Footer } from '@/footer';
import { RailLines } from '@/rail-lines';
import { usePageVisible } from '@/use-page-visible';

export const Home = () => {
  const isVisible = usePageVisible();
  const rafId = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);

  const startLoop = useCallback(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId.current = requestAnimationFrame(raf);
    };
    rafId.current = requestAnimationFrame(raf);
  }, []);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafId.current);
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
      <RailLines />
      <section className="w-full h-dvh md:h-auto flex-1 flex flex-col gap-8 sm:gap-10 sm:justify-around sm:py-40">
        <RetroLanding />
        <div className="sm:hidden flex flex-col gap-3 items-center justify-center mt-auto z-20 pb-6">
          <ModelLinks />
        </div>
      </section>
      <div className="py-40">
        <Showcase />
      </div>
      <div className="hidden sm:flex justify-center pb-12 pt-16">
        <ModelLinks />
      </div>
      <Footer />
    </div>
  );
};
