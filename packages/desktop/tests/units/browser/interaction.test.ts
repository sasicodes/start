import { runInNewContext } from 'node:vm';
import { pressKeyIn } from '@main/browser/input';
import { clickBrowserElement, parseLocateResult, scrollBrowserPage, typeBrowserText } from '@main/browser/interaction';
import { browserKey } from '@main/browser/keys';
import type { WebContents } from 'electron';
import { describe, expect, it, vi } from 'vitest';

type ScriptResult = unknown | ((script: string) => unknown);

const createWebContents = (result: ScriptResult = { ok: true, x: 40, y: 60 }, attachable = true) => {
  const scripts: string[] = [];
  const commands: { method: string; params: unknown }[] = [];
  const webContents = {
    isDestroyed: () => false,
    executeJavaScript: async (script: string) => {
      scripts.push(script);
      return typeof result === 'function' ? (result as (value: string) => unknown)(script) : result;
    },
    debugger: {
      attach: () => {
        if (!attachable) throw new Error('Another debugger is already attached.');
      },
      detach: () => {},
      isAttached: () => attachable,
      once: () => {},
      sendCommand: async (method: string, params: unknown) => {
        commands.push({ method, params });
        return {};
      }
    }
  } as unknown as WebContents;
  return { commands, scripts, webContents };
};

const mouseCommands = (commands: { method: string; params: unknown }[]) =>
  commands.filter((command) => command.method === 'Input.dispatchMouseEvent').map((command) => command.params);

describe('parseLocateResult', () => {
  it('keeps a valid point', () => {
    expect(parseLocateResult({ ok: true, x: 12, y: 24 })).toEqual({ ok: true, point: { x: 12, y: 24 } });
  });

  it('rejects results without coordinates', () => {
    expect(parseLocateResult({ ok: true })).toEqual({ ok: false, error: 'Could not read the element position.' });
    expect(parseLocateResult({ ok: false, error: 'Element is disabled.' })).toEqual({
      ok: false,
      error: 'Element is disabled.'
    });
    expect(parseLocateResult(null)).toEqual({ ok: false, error: 'Browser action failed.' });
  });
});

describe('clickBrowserElement', () => {
  it.each([false, true])('rechecks a moving target before clicking, continuously moving: %s', async (moving) => {
    let left = 10;
    let taps = 0;
    const scrollIntoView = vi.fn();
    const document = {};
    const element = {
      isConnected: true,
      ownerDocument: document,
      scrollIntoView,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ left, top: 20, width: 40, height: 30 })
    };
    const { commands, webContents } = createWebContents((script: string) => {
      if (!script.includes('browserElementForRef')) return null;
      return runInNewContext(script, {
        window: {
          location: { href: 'https://example.com/' },
          __startBrowserElements__: { url: 'https://example.com/', elements: new Map([['e1', element]]) },
          innerWidth: 800,
          innerHeight: 600,
          getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
          __startCursor__: {
            tapElement: async () => {
              if (taps++ === 0 || moving) left += 100;
            }
          }
        },
        document: Object.assign(document, { elementFromPoint: () => element })
      });
    });
    const result = await clickBrowserElement(webContents, 'e1');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'center', behavior: 'instant' });
    if (moving) {
      expect(result.ok).toBe(false);
      expect(commands).toHaveLength(0);
      expect(taps).toBe(3);
    } else {
      expect(result.ok).toBe(true);
      expect(mouseCommands(commands)[1]).toMatchObject({ x: 130, y: 35 });
      expect(taps).toBe(2);
    }
  });

  it('moves the cursor to the element, then clicks it with real mouse events', async () => {
    const { commands, scripts, webContents } = createWebContents();

    await expect(clickBrowserElement(webContents, 'e2')).resolves.toEqual({ ok: true });

    const script = scripts[0] ?? '';
    expect(script).toContain('await window.__startCursor__?.tapElement(element);');
    expect(script).toContain('browserElementForRef("e2")');
    expect(mouseCommands(commands)).toEqual([
      { button: 'none', x: 40, y: 60, type: 'mouseMoved', buttons: 0 },
      { button: 'left', x: 40, y: 60, type: 'mousePressed', buttons: 1, clickCount: 1 },
      { button: 'left', x: 40, y: 60, type: 'mouseReleased', buttons: 0, clickCount: 1 }
    ]);
  });

  it('falls back to a page click when the debugger cannot attach', async () => {
    const { commands, scripts, webContents } = createWebContents({ ok: true, x: 10, y: 10 }, false);

    await expect(clickBrowserElement(webContents, 'e1')).resolves.toEqual({ ok: true });

    expect(commands).toHaveLength(0);
    expect(scripts[1]).toContain('element.click();');
  });

  it('stops when the page reports the element is covered', async () => {
    const { commands, webContents } = createWebContents({ ok: false, error: 'Element is covered by another element.' });

    await expect(clickBrowserElement(webContents, 'e1')).resolves.toEqual({
      ok: false,
      error: 'Element is covered by another element.'
    });
    expect(commands).toHaveLength(0);
  });
});

describe('typeBrowserText', () => {
  it.each(['button', 'checkbox', 'readonly'])('rejects %s targets before clicking', async (kind) => {
    const document = {};
    class Input {
      isConnected = true;
      ownerDocument = document;
      type = kind === 'readonly' ? 'text' : kind;
      readOnly = kind === 'readonly';
      getBoundingClientRect = () => ({ width: 100, height: 30 });
      getAttribute = () => null;
    }
    class Textarea {}
    const element = new Input();
    const { commands, webContents } = createWebContents((script: string) =>
      runInNewContext(script, {
        HTMLInputElement: Input,
        HTMLTextAreaElement: Textarea,
        window: {
          location: { href: 'https://example.com/' },
          __startBrowserElements__: { url: 'https://example.com/', elements: new Map([['e1', element]]) },
          __startCursor__: {},
          getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
        },
        document
      })
    );
    await expect(typeBrowserText(webContents, 'e1', 'hello', true)).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('editable field')
    });
    expect(commands).toHaveLength(0);
  });

  it('clicks the field, clears it, and inserts the text', async () => {
    const { commands, webContents } = createWebContents();

    await expect(typeBrowserText(webContents, 'e1', 'hello', true)).resolves.toEqual({ ok: true });

    const methods = commands.map((command) => command.method);
    expect(methods.filter((method) => method === 'Input.dispatchMouseEvent')).toHaveLength(3);
    expect(methods).toContain('Input.insertText');
    expect(commands.at(-1)).toEqual({ method: 'Input.insertText', params: { text: 'hello' } });
  });

  it('falls back to a page edit without the debugger', async () => {
    const { scripts, webContents } = createWebContents({ ok: true, x: 10, y: 10 }, false);

    await expect(typeBrowserText(webContents, 'e1', 'hello', false)).resolves.toEqual({ ok: true });

    expect(scripts[1]).toContain("Object.getOwnPropertyDescriptor(prototype, 'value')");
  });
});

describe('scrollBrowserPage', () => {
  it('reads document scrolling from the scrolling element rather than body', async () => {
    const body = { scrollTop: 0, scrollLeft: 0 };
    const root = { scrollTop: 0, scrollLeft: 0, isConnected: true };
    const context = {
      window: { innerWidth: 800, innerHeight: 600 },
      document: { body, documentElement: root, scrollingElement: root, elementFromPoint: () => body }
    };
    const { webContents } = createWebContents((script: string) => {
      if (script.includes('__startScrollTarget__')) {
        if (script.includes('delete window.__startScrollTarget__')) root.scrollTop = 600;
        return runInNewContext(script, context);
      }
      return { ok: true, x: 50, y: 50 };
    });
    await expect(scrollBrowserPage(webContents, 'down', 600)).resolves.toEqual({ ok: true });
  });

  it.each([true, false])('uses the vertical ancestor over a horizontal child, CDP: %s', async (attachable) => {
    const root = { scrollTop: 0, scrollLeft: 0, isConnected: true };
    const parent = {
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 1200,
      clientHeight: 400,
      scrollWidth: 300,
      clientWidth: 300,
      isConnected: true,
      parentElement: root,
      scrollBy: ({ top }: { top: number }) => {
        parent.scrollTop += top;
      }
    };
    const child = {
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 100,
      clientHeight: 100,
      scrollWidth: 900,
      clientWidth: 300,
      isConnected: true,
      parentElement: parent
    };
    const context = {
      window: { innerWidth: 800, innerHeight: 600, getComputedStyle: () => ({ overflowX: 'auto', overflowY: 'auto' }) },
      document: { body: root, documentElement: root, scrollingElement: root, elementFromPoint: () => child }
    };
    const { webContents } = createWebContents((script: string) => {
      if (script.includes('__startScrollTarget__')) return runInNewContext(script, context);
      return { ok: true, x: 400, y: 300 };
    }, attachable);
    vi.spyOn(webContents.debugger, 'sendCommand').mockImplementation(async () => {
      parent.scrollTop = 300;
      return {};
    });
    await expect(scrollBrowserPage(webContents, 'down', 300)).resolves.toEqual({ ok: true });
    expect(parent.scrollTop).toBe(300);
    expect(child.scrollLeft).toBe(0);
    expect(root.scrollTop).toBe(0);
    expect(context.window).not.toHaveProperty('__startScrollTarget__');
  });

  it('wheels at the cursor anchor and reports movement', async () => {
    const offsets = [
      { ok: true, x: 50, y: 50 },
      { top: 0, left: 0 },
      { top: 600, left: 0 }
    ];
    const { commands, webContents } = createWebContents((script: string) =>
      script.includes('?.expectInput(') ? null : offsets.shift()
    );

    await expect(scrollBrowserPage(webContents, 'down', 600)).resolves.toEqual({ ok: true });

    expect(mouseCommands(commands)).toEqual([
      { button: 'none', x: 50, y: 50, type: 'mouseWheel', deltaX: 0, deltaY: 600 }
    ]);
  });

  it('reports when the page cannot scroll further', async () => {
    const results = [
      { ok: true, x: 50, y: 50 },
      { top: 900, left: 0 },
      { top: 900, left: 0 }
    ];
    const { webContents } = createWebContents((script: string) =>
      script.includes('?.expectInput(') ? null : results.shift()
    );

    await expect(scrollBrowserPage(webContents, 'down')).resolves.toEqual({
      ok: false,
      error: 'The page did not scroll any further.'
    });
  });
});

describe('browser interaction errors', () => {
  it('reports the page error text when the injected script fails', async () => {
    const { webContents } = createWebContents(() => {
      throw new Error('Script failed.');
    });

    await expect(clickBrowserElement(webContents, 'e1')).resolves.toEqual({ ok: false, error: 'Script failed.' });
  });

  it('does not click when the element is missing', async () => {
    const { commands, webContents } = createWebContents({
      ok: false,
      error: 'Element not found. Take a new browser snapshot.'
    });
    const click = vi.fn();

    await expect(clickBrowserElement(webContents, 'e9')).resolves.toEqual({
      ok: false,
      error: 'Element not found. Take a new browser snapshot.'
    });
    expect(click).not.toHaveBeenCalled();
    expect(commands).toHaveLength(0);
  });
});

describe('browser key input', () => {
  it.each(['cmd+Enter', 'ctrl+Tab', 'alt+Space', 'ctrl+shift+Enter'])(
    'dispatches %s without inserting text',
    async (value) => {
      const { webContents, commands } = createWebContents();
      const key = browserKey(value);
      if (!key) throw new Error('Expected a supported key.');
      await pressKeyIn(webContents, key);
      expect(commands[0]?.params).toMatchObject({ type: 'rawKeyDown', modifiers: key.modifiers });
      expect(commands[0]?.params).not.toHaveProperty('text');
      expect(commands[1]?.params).toMatchObject({ type: 'keyUp' });
    }
  );

  it.each(['Enter', 'shift+Enter', 'Space'])('preserves text for %s', async (value) => {
    const { webContents, commands } = createWebContents();
    const key = browserKey(value);
    if (!key) throw new Error('Expected a supported key.');
    await pressKeyIn(webContents, key);
    expect(commands[0]?.params).toMatchObject({ type: 'keyDown', text: key.text });
  });
});
