import { runInNewContext } from 'node:vm';
import { hideBrowserCursor, withBrowserCursor } from '@main/browser/cursor/index';
import { cursorScript } from '@main/browser/cursor/script';
import { destroyBrowser, releaseBrowserControl, setBrowserBounds } from '@main/browser/index';
import type { WebContents } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeBrowserWindow, resetFakeBrowserWindows } from '../../fakes/electron.js';

const createWebContents = (destroyed = false) => {
  const executeJavaScript = vi.fn(async () => undefined);
  const webContents = { executeJavaScript, isDestroyed: () => destroyed } as unknown as WebContents;
  return { executeJavaScript, webContents };
};

describe('agent cursor script', () => {
  it('is valid javascript', () => {
    expect(() => new Function(cursorScript)).not.toThrow();
  });

  it('installs a single closed overlay above page content', () => {
    expect(cursorScript).toContain('if (window.__startCursor__) return;');
    expect(cursorScript).toContain("attachShadow({ mode: 'closed' })");
    expect(cursorScript).toContain("pointerEvents: 'none'");
  });

  it('gives up control on trusted input, hidden pages, and page unload', () => {
    expect(cursorScript).toContain('if (event.isTrusted && !agentInput(event)) hide();');
    expect(cursorScript).toContain("if (document.visibilityState !== 'visible') hide();");
    expect(cursorScript).toContain("window.addEventListener('pagehide', hide");
  });

  it('uses a watchdog to enter the waiting state without an inactivity hide', () => {
    expect(cursorScript).toContain('watchdog = window.setInterval(watch, WATCHDOG_MS);');
    expect(cursorScript).not.toContain('IDLE_HIDE_MS');
    expect(cursorScript).toContain('window.clearInterval(watchdog);');
  });

  it('dims into a waiting state only while no action is running', () => {
    expect(cursorScript).toContain('if (idle > WAITING_MS && !busy()) startWaiting();');
    expect(cursorScript).toContain('const busy = () => frameId !== 0 || arrivals.length > 0 || taps > 0;');
    expect(cursorScript).toContain("root.style.opacity = '0.55';");
  });

  it('keeps a drop shadow under the arrow in every state', () => {
    expect(cursorScript).toContain("const SHADOW = 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,.34))'");
    expect(cursorScript).toContain('glyph.style.filter = SHADOW + GLOW;');
    expect(cursorScript).toContain('glyph.style.filter = SHADOW + GLOW;');
  });

  it('survives strict page policies by avoiding innerHTML and injected stylesheets', () => {
    expect(cursorScript).not.toContain('innerHTML');
    expect(cursorScript).not.toContain("createElement('style')");
    expect(cursorScript).toContain("document.createElementNS(SVG_NS, 'svg')");
  });

  it('wraps an action body in a valid async script', () => {
    const script = withBrowserCursor('return { ok: true };');

    expect(() => new Function(`return ${script.trim()}`)).not.toThrow();
    expect(script.indexOf('__startCursor__')).toBeLessThan(script.indexOf('return { ok: true };'));
  });
});

describe('releaseBrowserControl', () => {
  afterEach(() => {
    destroyBrowser();
    resetFakeBrowserWindows();
  });

  it('hides the cursor, clears the viewport override, and detaches the debugger', async () => {
    const window = createFakeBrowserWindow();
    setBrowserBounds(window.webContents as unknown as WebContents, { x: 0, y: 0, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');
    const executeJavaScript = vi.spyOn(view.webContents, 'executeJavaScript');

    releaseBrowserControl();
    await vi.waitFor(() => expect(view.webContents.debugger.attached).toBe(false));

    expect(executeJavaScript).toHaveBeenCalledWith('window.__startCursor__?.hide();', true);
    expect(view.webContents.debugger.commands).toEqual([]);
  });
});

describe('hideBrowserCursor', () => {
  it('asks the page to hide the cursor', () => {
    const { executeJavaScript, webContents } = createWebContents();

    hideBrowserCursor(webContents);

    expect(executeJavaScript).toHaveBeenCalledWith('window.__startCursor__?.hide();', true);
  });

  it('skips destroyed pages', () => {
    const { executeJavaScript, webContents } = createWebContents(true);

    hideBrowserCursor(webContents);

    expect(executeJavaScript).not.toHaveBeenCalled();
  });
});

interface CursorEvent {
  type: string;
  clientX: number;
  clientY: number;
  isTrusted: boolean;
}

const cursorRuntime = (reduced = true) => {
  const styles: Record<string, string>[] = [];
  const frames = new Map<number, (now: number) => void>();
  let frameId = 0;
  const intervals = new Map<number, () => void>();
  const animations: unknown[] = [];
  const timeouts: (() => void)[] = [];
  const listeners = new Map<string, (event: CursorEvent) => void>();
  const node = (): object => {
    const style = {};
    styles.push(style);
    return {
      style,
      isConnected: true,
      appendChild: () => {},
      setAttribute: () => {},
      attachShadow: node,
      cloneNode: node,
      animate: (keyframes: unknown) => {
        animations.push(keyframes);
        return { cancel: () => {} };
      }
    };
  };
  let now = 100;
  const window = {
    setTimeout: (callback: () => void) => {
      timeouts.push(callback);
      return 1;
    },
    clearTimeout: () => {},
    requestAnimationFrame: (callback: (now: number) => void) => {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    innerWidth: 800,
    innerHeight: 600,
    setInterval: (callback: () => void) => {
      intervals.set(1, callback);
      return 1;
    },
    clearInterval: (id: number) => intervals.delete(id),
    matchMedia: () => ({ matches: reduced }),
    addEventListener: (type: string, handler: (event: CursorEvent) => void) => listeners.set(type, handler)
  };
  const context = {
    window,
    performance: { now: () => now },
    document: { createElement: node, createElementNS: node, addEventListener: () => {} }
  };
  runInNewContext(cursorScript, context);
  const cursor = (
    window as typeof window & {
      __startCursor__: {
        tap: () => Promise<void>;
        show: () => void;
        hide: () => void;
        moveTo: (x: number, y: number) => Promise<void>;
        isVisible: () => boolean;
        expectInput: (type: string, x: number, y: number) => void;
      };
    }
  ).__startCursor__;
  return {
    cursor,
    styles,
    frames,
    animations,
    intervals,
    finishTimeouts: () => {
      for (const callback of timeouts.splice(0)) callback();
    },
    step: () => {
      now += 16;
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(now);
    },
    advance: () => {
      now += 1100;
      for (const callback of intervals.values()) callback();
    },
    dispatch: (type: string, clientX = 40, clientY = 60) =>
      listeners.get(type)?.({ type, clientX, clientY, isTrusted: true })
  };
};

describe('cursor input ownership', () => {
  it.each(['pointerdown', 'wheel', 'pointermove'])('keeps the cursor visible for agent %s', (type) => {
    const { cursor, dispatch } = cursorRuntime();
    cursor.show();
    cursor.expectInput(type, 40, 60);
    dispatch(type);
    expect(cursor.isVisible()).toBe(true);
  });

  it.each(['pointerdown', 'wheel'])('still yields to a user %s after the agent event', (type) => {
    const { cursor, dispatch } = cursorRuntime();
    cursor.show();
    cursor.expectInput(type, 40, 60);
    dispatch(type);
    dispatch(type);
    expect(cursor.isVisible()).toBe(false);
  });

  it('does not ignore a user click elsewhere', () => {
    const { cursor, dispatch } = cursorRuntime();
    cursor.show();
    cursor.expectInput('pointerdown', 40, 60);
    dispatch('pointerdown', 100, 200);
    expect(cursor.isVisible()).toBe(false);
  });

  it('expires an expected event that never arrived', () => {
    const { cursor, dispatch, advance } = cursorRuntime();
    cursor.show();
    cursor.expectInput('wheel', 40, 60);
    advance();
    dispatch('wheel');
    expect(cursor.isVisible()).toBe(false);
  });
});

describe('cursor directional motion', () => {
  it.each([
    [700, 300, 1],
    [100, 300, -1],
    [400, 550, 1],
    [400, 50, -1]
  ])('tilts toward movement to %s,%s then settles', async (x, y, sign) => {
    const { cursor, step, styles, frames } = cursorRuntime(false);
    const initial = cursor.moveTo(400, 300);
    for (let i = 0; i < 100; i++) step();
    await initial;
    const movement = cursor.moveTo(x, y);
    for (let i = 0; i < 5; i++) step();
    const transform = styles[3]?.transform ?? '';
    const tilt = Number(/rotate\(([-\d.]+)deg\)/.exec(transform)?.[1]);
    expect(tilt * sign).toBeGreaterThan(2);
    expect(styles[3]?.transformOrigin).toBe('9.2px 6.72px');
    expect(Math.abs(tilt)).toBeLessThanOrEqual(18);
    for (let i = 0; i < 100; i++) step();
    await movement;
    expect(styles[3]?.transform).toBe('rotate(0.00deg) scale(1)');
    expect(frames.size).toBe(0);
  });

  it('cancels pending movement when the user takes over', async () => {
    const { cursor, dispatch, frames } = cursorRuntime(false);
    const movement = cursor.moveTo(700, 400);
    const result = expect(movement).rejects.toThrow('cancelled');
    dispatch('pointerdown');
    await result;
    expect(frames.size).toBe(0);
    expect(cursor.isVisible()).toBe(false);
  });

  it('rejects a movement deadline instead of clicking an unreached target', async () => {
    const { cursor, finishTimeouts } = cursorRuntime(false);
    const movement = cursor.moveTo(700, 400);
    const result = expect(movement).rejects.toThrow('timed out');
    finishTimeouts();
    await result;
    cursor.hide();
  });

  it('moves immediately without tilt when reduced motion is enabled', async () => {
    const { cursor, styles, frames } = cursorRuntime();
    await cursor.moveTo(700, 400);
    expect(styles[3]?.transform).toBe('rotate(0.00deg) scale(1)');
    expect(frames.size).toBe(0);
  });
});

describe('cursor waiting state', () => {
  it('stays dimmed and gently tilts throughout a long pause, then resumes', async () => {
    const { cursor, advance, styles, animations, intervals } = cursorRuntime(false);
    cursor.show();
    for (let i = 0; i < 30; i++) advance();
    expect(cursor.isVisible()).toBe(true);
    expect(styles[2]?.opacity).toBe('0.55');
    expect(styles[2]?.width).toBe('24px');
    expect(animations).toHaveLength(1);
    expect(animations[0]).toEqual(expect.arrayContaining([expect.objectContaining({ transform: 'rotate(-4deg)' })]));
    cursor.show();
    expect(styles[2]?.opacity).toBe('1');
    cursor.hide();
    expect(cursor.isVisible()).toBe(false);
    expect(intervals.size).toBe(0);
  });
});

describe('cursor click feedback', () => {
  it('anchors tilt at the base and pulses only the shadow on click', async () => {
    const { cursor, styles, animations, finishTimeouts } = cursorRuntime(false);
    const clicked = cursor.tap();
    expect(styles[3]?.transformOrigin).toBe('9.2px 6.72px');
    expect(styles[4]?.transformOrigin).toBe('13px 15px');
    expect(animations).toHaveLength(1);
    expect(animations[0]).toEqual([
      expect.objectContaining({ filter: expect.stringContaining('drop-shadow') }),
      expect.objectContaining({ filter: expect.stringContaining('#ff3f0066'), offset: 0.35 }),
      expect.objectContaining({ filter: expect.stringContaining('drop-shadow') })
    ]);
    expect(styles.some((style) => style.borderRadius === '9999px')).toBe(false);
    finishTimeouts();
    await clicked;
  });
});
