import { composerClearance } from '@renderer/shared/composer/state';
import { useLayoutEffect, useRef } from 'preact/hooks';

export const composerSpacing = (height: number, attachedHeight: number) => {
  const overhang = Math.max(0, attachedHeight - 2);
  return { overhang, clearance: Math.max(112, Math.ceil(height + overhang + 34)) };
};

export const observeComposerClearance = (element: HTMLFormElement, shell: HTMLElement) => {
  let frame = 0;
  let active = true;
  const attached = shell.querySelector<HTMLElement>('[data-composer-attached]');
  const sync = () => {
    frame = 0;
    const { overhang, clearance } = composerSpacing(element.offsetHeight, attached?.offsetHeight ?? 0);
    const value = `${overhang}px`;
    if (shell.style.getPropertyValue('--composer-overhang') !== value) {
      shell.style.setProperty('--composer-overhang', value);
    }
    if (composerClearance.peek() !== clearance) composerClearance.value = clearance;
  };
  const observer = new ResizeObserver(() => {
    if (!active || frame) return;
    frame = window.requestAnimationFrame(sync);
  });
  observer.observe(element);
  if (attached) observer.observe(attached);
  sync();

  return () => {
    active = false;
    observer.disconnect();
    window.cancelAnimationFrame(frame);
  };
};

export const useComposerClearance = (enabled: boolean, finderVisible: boolean, attachedVisible: boolean) => {
  const ref = useRef<HTMLFormElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const shell = element?.parentElement;
    if (!element || !shell || !enabled) return;

    return observeComposerClearance(element, shell);
  }, [enabled, finderVisible, attachedVisible]);

  return ref;
};
