import { hasContentBelow, observeScrollToBottom } from '@renderer/shared/turn/use-scroll-to-bottom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const viewport = (distance: number) =>
  ({ scrollHeight: 2400, clientHeight: 600, scrollTop: 1800 - distance }) as HTMLElement;

describe('hasContentBelow', () => {
  it('shows the arrow only beyond the original one-page threshold', () => {
    expect(hasContentBelow(viewport(601))).toBe(true);
    expect(hasContentBelow(viewport(1200))).toBe(true);
  });

  it('hides the arrow within one page of the bottom', () => {
    expect(hasContentBelow(viewport(0))).toBe(false);
    expect(hasContentBelow(viewport(600))).toBe(false);
  });
});

describe('streaming visibility', () => {
  let resize = () => {};
  const disconnect = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      cancelAnimationFrame: clearTimeout,
      requestAnimationFrame: (callback: () => void) => setTimeout(callback, 16)
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const setup = () => {
    const element = Object.assign(new EventTarget(), {
      scrollTop: 400,
      scrollHeight: 1000,
      clientHeight: 600
    });
    const publish = vi.fn();
    const node = element as unknown as HTMLElement;
    const stop = observeScrollToBottom(node, node, publish);
    return { stop, element, publish };
  };

  it('does not flash during repeated growth and auto-scroll corrections', () => {
    const { stop, element, publish } = setup();
    for (let index = 0; index < 10; index += 1) {
      element.scrollHeight += 700;
      resize();
      vi.advanceTimersByTime(32);
      element.scrollTop += 700;
      element.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(150);
    }
    expect(publish.mock.calls).toEqual([[false]]);
    stop();
  });

  it('shows for a sustained gap and hides when the reader reaches the bottom', () => {
    const { stop, element, publish } = setup();
    element.scrollHeight = 2000;
    resize();
    vi.advanceTimersByTime(136);
    expect(publish).toHaveBeenLastCalledWith(true);
    element.scrollTop = 1400;
    element.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(16);
    expect(publish).toHaveBeenLastCalledWith(false);
    stop();
  });

  it('coalesces event bursts without postponing the reveal or moving the viewport', () => {
    const { stop, element, publish } = setup();
    element.scrollHeight = 2000;
    for (let index = 0; index < 30; index += 1) {
      resize();
      element.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(5);
    }
    expect(publish.mock.calls).toEqual([[false], [true]]);
    expect(element.scrollTop).toBe(400);
    stop();
  });

  it('updates the original threshold when the viewport resizes', () => {
    const { stop, element, publish } = setup();
    element.scrollHeight = 2000;
    vi.advanceTimersByTime(136);
    expect(publish).toHaveBeenLastCalledWith(true);
    element.clientHeight = 900;
    resize();
    vi.advanceTimersByTime(16);
    expect(publish).toHaveBeenLastCalledWith(false);
    expect(element.scrollTop).toBe(400);
    stop();
  });

  it('removes listeners and pending frames on cleanup', () => {
    const { stop, element, publish } = setup();
    stop();
    publish.mockClear();
    element.scrollHeight = 2000;
    element.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(200);
    expect(publish).not.toHaveBeenCalled();
  });

  it('cancels a pending reveal when unmounted', () => {
    const { stop, element, publish } = setup();
    element.scrollHeight = 2000;
    resize();
    vi.advanceTimersByTime(16);
    stop();
    vi.advanceTimersByTime(200);
    expect(publish.mock.calls.every(([visible]) => visible === false)).toBe(true);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
