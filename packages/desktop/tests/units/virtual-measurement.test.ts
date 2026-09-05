import { observeHeight } from '@renderer/ui/virtual/measurement';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

it('defers resize delivery, coalesces measurements, and cancels on cleanup', () => {
  let resize = () => {};
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const disconnect = vi.fn();
  const onHeight = vi.fn();
  const element = { offsetHeight: 20 } as HTMLElement;
  vi.stubGlobal('window', {
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      nextFrame += 1;
      frames.set(nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id)
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = disconnect;
      constructor(callback: () => void) {
        resize = callback;
      }
    }
  );
  const stop = observeHeight(element, onHeight);
  expect(onHeight).toHaveBeenCalledExactlyOnceWith(20);
  Object.defineProperty(element, 'offsetHeight', { value: 40, configurable: true });
  resize();
  resize();
  expect(onHeight).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(1);
  for (const callback of frames.values()) callback(0);
  frames.clear();
  expect(onHeight).toHaveBeenLastCalledWith(40);
  resize();
  stop();
  resize();
  expect(frames.size).toBe(0);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(onHeight).toHaveBeenCalledTimes(2);
});
