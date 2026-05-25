import { animate, useMotionValue, type AnimationPlaybackControls, type Transition } from 'motion/react';
import { useEffect, useRef } from 'preact/hooks';

export const useMorph = (target: number, transition: Transition) => {
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const targetRef = useRef(target);
  const value = useMotionValue(target);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    targetRef.current = target;
    if (runningRef.current) return;

    const run = async () => {
      runningRef.current = true;
      while (mountedRef.current && value.get() !== targetRef.current) {
        controlsRef.current = animate(value, targetRef.current, transition);
        await controlsRef.current;
      }
      runningRef.current = false;
    };

    void run();
  }, [value, target, transition]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      controlsRef.current?.stop();
    },
    []
  );

  return value;
};
