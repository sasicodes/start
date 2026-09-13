import { useEffect, useRef, useState } from 'react';
import { observeRotation } from './utils/rotation';

export const useCarousel = (count: number) => {
  const loaded = useRef(new Set<number>());
  const ref = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  const load = (index: number) => {
    loaded.current.add(index);
    setReady(loaded.current.size === count);
  };

  useEffect(() => {
    if (!ref.current || !ready || paused) return;
    return observeRotation(ref.current, () => setActive((index) => (index + 1) % count));
  }, [count, ready, paused, active]);

  return { ref, load, active, paused, setActive, setPaused };
};
