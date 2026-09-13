import { usePanelResize } from '@renderer/shared/panel/resize';
import type { JSX } from 'preact';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('preact/hooks', () => ({
  useRef: <T>(current: T) => ({ current }),
  useState: <T>(value: T | (() => T)) => [typeof value === 'function' ? (value as () => T)() : value, () => {}],
  useCallback: <T>(callback: T) => callback,
  useEffect: () => {},
  useLayoutEffect: () => {}
}));
afterEach(() => vi.unstubAllGlobals());
it('commits the final drag coordinate before the scheduled frame renders', () => {
  const handlers = new Map<string, (event: PointerEvent) => void>();
  const setItem = vi.fn();
  const cancelFrame = vi.fn();
  const style = { cursor: '', userSelect: '' };
  vi.stubGlobal('window', {
    innerWidth: 1200,
    localStorage: { getItem: () => '600', setItem },
    addEventListener: (name: string, callback: (event: PointerEvent) => void) => handlers.set(name, callback)
  });
  vi.stubGlobal('document', { body: { style }, documentElement: { style } });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
  const resize = usePanelResize({
    fallbackWidth: 600,
    sidePanelVisible: true,
    minSidePanelWidthRatio: 0.5,
    maxSidePanelWidthRatio: 0.7
  });
  const setProperty = vi.fn();
  resize.rootRef.current = { clientWidth: 1200, style: { setProperty } } as unknown as HTMLDivElement;
  resize.startResize({
    button: 0,
    clientX: 600,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as unknown as JSX.TargetedPointerEvent<HTMLDivElement>);
  handlers.get('pointermove')?.({ clientX: 450 } as PointerEvent);
  handlers.get('pointerup')?.({ type: 'pointerup', clientX: 400 } as PointerEvent);
  expect(setProperty).toHaveBeenCalledWith('--panel-width', '800px');
  expect(setItem).toHaveBeenCalledWith('start:panel-width', '800');
  expect(cancelFrame).toHaveBeenCalledWith(1);
  expect(style.userSelect).toBe('');
});
