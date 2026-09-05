import { observeViewport } from '@renderer/ui/virtual/viewport';
import { afterEach, expect, it, vi } from 'vitest';

class ViewportElement extends EventTarget {
  constructor(readonly parentElement: ViewportElement | null = null) {
    super();
  }
}

afterEach(() => vi.unstubAllGlobals());

const setup = () => {
  let nextFrame = 0;
  let notifyResize = () => {};
  const frames = new Map<number, FrameRequestCallback>();
  const observe = vi.fn();
  const disconnect = vi.fn();
  const compute = vi.fn();
  const outer = new ViewportElement();
  const scroller = new ViewportElement(outer);
  const container = new ViewportElement(scroller);
  const viewport = Object.assign(new EventTarget(), {
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      nextFrame += 1;
      frames.set(nextFrame, callback);
      return nextFrame;
    }),
    cancelAnimationFrame: vi.fn((id: number) => frames.delete(id))
  });
  vi.stubGlobal('window', viewport);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observe;
      disconnect = disconnect;
      constructor(callback: () => void) {
        notifyResize = callback;
      }
    }
  );
  const stop = observeViewport(container as unknown as HTMLElement, compute);
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(0);
  };
  return {
    stop,
    flush,
    outer,
    frames,
    compute,
    observe,
    scroller,
    viewport,
    container,
    disconnect,
    resize: () => notifyResize()
  };
};

it('performs initial measurement and schedules no idle frames', () => {
  const state = setup();
  expect(state.frames.size).toBe(1);
  state.flush();
  for (let frame = 0; frame < 120; frame += 1) state.flush();
  expect(state.compute).toHaveBeenCalledOnce();
  expect(state.viewport.requestAnimationFrame).toHaveBeenCalledOnce();
  expect(state.frames.size).toBe(0);
  state.stop();
});

it('coalesces scrolling and layout changes into one measurement per frame', () => {
  const state = setup();
  state.flush();
  state.scroller.dispatchEvent(new Event('scroll'));
  state.outer.dispatchEvent(new Event('scroll'));
  state.viewport.dispatchEvent(new Event('scroll'));
  state.viewport.dispatchEvent(new Event('resize'));
  state.resize();
  expect(state.frames.size).toBe(1);
  state.flush();
  expect(state.compute).toHaveBeenCalledTimes(2);
  expect(state.observe.mock.calls.map(([element]) => element)).toEqual([state.container, state.scroller, state.outer]);
  expect(state.frames.size).toBe(0);
  state.stop();
});

it('removes listeners, disconnects observation, and cancels pending measurements on cleanup', () => {
  const state = setup();
  state.stop();
  state.flush();
  state.container.dispatchEvent(new Event('scroll'));
  state.scroller.dispatchEvent(new Event('scroll'));
  state.outer.dispatchEvent(new Event('scroll'));
  state.viewport.dispatchEvent(new Event('scroll'));
  state.viewport.dispatchEvent(new Event('resize'));
  state.resize();
  expect(state.disconnect).toHaveBeenCalledOnce();
  expect(state.compute).not.toHaveBeenCalled();
  expect(state.frames.size).toBe(0);
});
