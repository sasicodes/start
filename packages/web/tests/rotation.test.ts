import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeRotation } from '../src/components/retro/showcase/utils/rotation';

class Surface extends EventTarget {
  hovered = false;
  focused = false;
  child = new EventTarget();

  matches(selector: string) {
    return selector === ':hover' ? this.hovered : this.focused;
  }

  contains(node: EventTarget) {
    return node === this.child;
  }
}

describe('showcase rotation', () => {
  const advance = vi.fn();
  const disconnect = vi.fn();
  let element: Surface;
  let cleanup: () => void;
  let intersect: (ratio: number) => void;
  let motion: EventTarget & { matches: boolean };
  let page: EventTarget & { visibilityState: string };

  beforeEach(() => {
    vi.useFakeTimers();
    element = new Surface();
    motion = Object.assign(new EventTarget(), { matches: false });
    page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    vi.stubGlobal('Node', EventTarget);
    vi.stubGlobal('document', page);
    vi.stubGlobal('window', { matchMedia: () => motion });
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        disconnect = disconnect;

        constructor(
          callback: (entries: Pick<IntersectionObserverEntry, 'isIntersecting' | 'intersectionRatio'>[]) => void
        ) {
          intersect = (ratio) => callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
        }

        observe() {}
      }
    );
    cleanup = observeRotation(element as unknown as HTMLElement, advance);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('starts only when a quarter of the showcase is visible and stops offscreen', () => {
    vi.advanceTimersByTime(12000);
    intersect(0.1);
    vi.advanceTimersByTime(12000);
    expect(advance).not.toHaveBeenCalled();
    intersect(0.5);
    vi.advanceTimersByTime(12000);
    expect(advance).toHaveBeenCalledTimes(2);
    intersect(0);
    vi.advanceTimersByTime(12000);
    expect(advance).toHaveBeenCalledTimes(2);
  });

  it('gives a fresh reading interval after hover and keyboard focus leave', () => {
    intersect(1);
    vi.advanceTimersByTime(5000);
    element.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(12000);
    expect(advance).not.toHaveBeenCalled();
    element.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(5999);
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(advance).toHaveBeenCalledTimes(1);
    element.dispatchEvent(new Event('focusin'));
    element.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget: element.child }));
    vi.advanceTimersByTime(12000);
    expect(advance).toHaveBeenCalledTimes(1);
    element.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget: null }));
    vi.advanceTimersByTime(6000);
    expect(advance).toHaveBeenCalledTimes(2);
  });

  it('suspends rotation in hidden tabs and when reduced motion is requested', () => {
    intersect(1);
    page.visibilityState = 'hidden';
    page.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(12000);
    expect(advance).not.toHaveBeenCalled();
    page.visibilityState = 'visible';
    page.dispatchEvent(new Event('visibilitychange'));
    motion.matches = true;
    motion.dispatchEvent(new Event('change'));
    vi.advanceTimersByTime(12000);
    expect(advance).not.toHaveBeenCalled();
    motion.matches = false;
    motion.dispatchEvent(new Event('change'));
    vi.advanceTimersByTime(6000);
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('preserves existing hover and focus when the active slide changes', () => {
    cleanup();
    element.hovered = true;
    element.focused = true;
    cleanup = observeRotation(element as unknown as HTMLElement, advance);
    intersect(1);
    element.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(12000);
    expect(advance).not.toHaveBeenCalled();
    element.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget: null }));
    vi.advanceTimersByTime(6000);
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('removes the timer, observer, and subscriptions on cleanup', () => {
    intersect(1);
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
    element.dispatchEvent(new Event('pointerleave'));
    page.dispatchEvent(new Event('visibilitychange'));
    motion.dispatchEvent(new Event('change'));
    vi.advanceTimersByTime(12000);
    expect(advance).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
