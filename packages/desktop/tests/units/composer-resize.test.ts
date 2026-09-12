import { composerClearance } from '@renderer/shared/composer/state';
import { observeComposerClearance } from '@renderer/shared/composer/use-clearance';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  composerClearance.value = 112;
  vi.unstubAllGlobals();
});

it('measures immediately, batches resize writes, skips unchanged values, and cancels on cleanup', () => {
  let resize = () => {};
  let nextFrame = 0;
  let offset = '';
  const frames = new Map<number, FrameRequestCallback>();
  const observe = vi.fn();
  const disconnect = vi.fn();
  const attached = { offsetHeight: 80 };
  const form = { offsetHeight: 46 } as HTMLFormElement;
  const setProperty = vi.fn((_name: string, value: string) => {
    offset = value;
  });
  const shell = {
    querySelector: () => attached,
    style: { setProperty, getPropertyValue: () => offset }
  } as unknown as HTMLElement;
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
      observe = observe;
      disconnect = disconnect;
      constructor(callback: () => void) {
        resize = callback;
      }
    }
  );

  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  };
  const stop = observeComposerClearance(form, shell);
  expect(observe.mock.calls).toEqual([[form], [attached]]);
  expect(composerClearance.value).toBe(158);
  expect(offset).toBe('78px');

  for (let index = 0; index < 20; index += 1) {
    attached.offsetHeight += 4;
    resize();
  }
  expect(frames.size).toBe(1);
  expect(composerClearance.value).toBe(158);
  expect(setProperty).toHaveBeenCalledTimes(1);
  flush();
  expect(composerClearance.value).toBe(238);
  expect(offset).toBe('158px');

  resize();
  flush();
  expect(setProperty).toHaveBeenCalledTimes(2);
  attached.offsetHeight = 40;
  resize();
  stop();
  resize();
  flush();
  expect(frames.size).toBe(0);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(composerClearance.value).toBe(238);
});
