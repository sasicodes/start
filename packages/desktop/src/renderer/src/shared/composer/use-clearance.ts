import { composerClearance } from '@renderer/shared/composer/state';
import { useLayoutEffect, useRef } from 'preact/hooks';

export const composerSpacing = (height: number, attachedHeight: number) => {
  const overhang = Math.max(0, attachedHeight - 2);
  return { overhang, clearance: Math.max(112, Math.ceil(height + overhang + 34)) };
};

export const useComposerClearance = (enabled: boolean, finderVisible: boolean, attachedVisible: boolean) => {
  const ref = useRef<HTMLFormElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const shell = element.parentElement;
    if (!shell) return;

    const attached = shell.querySelector<HTMLElement>('[data-composer-attached]');
    const sync = () => {
      const { overhang, clearance } = composerSpacing(element.offsetHeight, attached?.offsetHeight ?? 0);
      shell.style.setProperty('--composer-overhang', `${overhang}px`);
      composerClearance.value = clearance;
    };
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    if (attached) observer.observe(attached);
    sync();
    return () => observer.disconnect();
  }, [enabled, finderVisible, attachedVisible]);

  return ref;
};
