export const observeViewport = (element: HTMLElement, compute: () => void) => {
  let frame = 0;
  let active = true;
  const ancestors: HTMLElement[] = [];

  const schedule = () => {
    if (!active || frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      compute();
    });
  };

  const observer = new ResizeObserver(schedule);
  let ancestor: HTMLElement | null = element;
  while (ancestor) {
    observer.observe(ancestor);
    ancestor.addEventListener('scroll', schedule, { passive: true });
    ancestors.push(ancestor);
    ancestor = ancestor.parentElement;
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    active = false;
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    for (const target of ancestors) target.removeEventListener('scroll', schedule);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
};
