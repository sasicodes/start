export const observeRotation = (element: HTMLElement, advance: () => void) => {
  let visible = false;
  let hovered = element.matches(':hover');
  let focused = element.matches(':focus-within');
  let timer: ReturnType<typeof setInterval> | null = null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const update = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;

    if (visible && !hovered && !focused && !motion.matches && document.visibilityState === 'visible') {
      timer = setInterval(advance, 6000);
    }
  };

  const enter = () => {
    hovered = true;
    update();
  };

  const leave = () => {
    hovered = false;
    update();
  };

  const focus = () => {
    focused = true;
    update();
  };

  const blur = (event: FocusEvent) => {
    focused = event.relatedTarget instanceof Node && element.contains(event.relatedTarget);
    update();
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      update();
    },
    { threshold: 0.25 }
  );

  observer.observe(element);
  motion.addEventListener('change', update);
  element.addEventListener('focusin', focus);
  element.addEventListener('focusout', blur);
  element.addEventListener('pointerenter', enter);
  element.addEventListener('pointerleave', leave);
  document.addEventListener('visibilitychange', update);

  return () => {
    observer.disconnect();
    if (timer !== null) clearInterval(timer);
    motion.removeEventListener('change', update);
    element.removeEventListener('focusin', focus);
    element.removeEventListener('focusout', blur);
    element.removeEventListener('pointerenter', enter);
    element.removeEventListener('pointerleave', leave);
    document.removeEventListener('visibilitychange', update);
  };
};
