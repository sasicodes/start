import { clickMouseAt, insertTextIn, pressKeyIn, wheelMouseAt } from '@main/browser/input';
import { clickBrowserElement, typeBrowserText } from '@main/browser/interaction';
import { browserKey } from '@main/browser/keys';
import { clearBrowserViewport, setBrowserViewport } from '@main/browser/viewport';
import type { WebContents } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeBrowserWindow } from '../../fakes/electron.js';

const setup = () => {
  const fake = createFakeBrowserWindow().webContents;
  const webContents = fake as unknown as WebContents;
  vi.spyOn(fake, 'executeJavaScript').mockResolvedValue({ ok: true, x: 20, y: 30 });
  return { fake, webContents };
};
afterEach(() => vi.useRealTimers());

describe('browser input failures', () => {
  it.each(['mouseMoved', 'mousePressed', 'mouseReleased'])(
    'reports failed %s without retrying a DOM click',
    async (type) => {
      const { fake, webContents } = setup();
      vi.spyOn(fake.debugger, 'sendCommand').mockImplementation(async (_method, params) => {
        if ((params as { type: string }).type === type) throw new Error('detached');
        return {};
      });
      const result = await clickBrowserElement(webContents, 'e1');
      expect(result.ok).toBe(false);
      expect(fake.executeJavaScript).not.toHaveBeenCalledWith(expect.stringContaining('element.click();'), true);
      if (type === 'mouseReleased')
        expect(fake.inputEvents).toContainEqual(expect.objectContaining({ type: 'mouseUp' }));
    }
  );
  it.each(['rawKeyDown', 'keyUp'])('reports failed %s and attempts release', async (type) => {
    const { fake, webContents } = setup();
    const calls: string[] = [];
    vi.spyOn(fake.debugger, 'sendCommand').mockImplementation(async (_method, params) => {
      const event = (params as { type: string }).type;
      calls.push(event);
      if (event === type) throw new Error('detached');
      return {};
    });
    const key = browserKey('cmd+Enter');
    if (!key) throw new Error('key missing');
    await expect(pressKeyIn(webContents, key)).rejects.toThrow('interrupted');
    expect(calls).toContain('keyUp');
    if (type === 'keyUp') expect(fake.inputEvents).toContainEqual(expect.objectContaining({ type: 'keyUp' }));
  });
  it('bounds an unresponsive cursor registration and does not dispatch late input', async () => {
    vi.useFakeTimers();
    const { fake, webContents } = setup();
    let finish: () => void = () => {};
    vi.spyOn(fake, 'executeJavaScript').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(true);
        })
    );
    const result = expect(clickMouseAt(webContents, { x: 20, y: 30 })).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    finish();
    await Promise.resolve();
    expect(fake.debugger.commands).toHaveLength(0);
  });
  it('bounds an unresponsive CDP command', async () => {
    vi.useFakeTimers();
    const { fake, webContents } = setup();
    vi.spyOn(fake.debugger, 'sendCommand').mockImplementation(() => new Promise(() => {}));
    const result = expect(wheelMouseAt(webContents, { x: 20, y: 30 }, { x: 0, y: 100 })).rejects.toThrow('interrupted');
    await vi.advanceTimersByTimeAsync(5000);
    await result;
  });
  it('does not repeat an uncertain text insertion', async () => {
    const { fake, webContents } = setup();
    vi.spyOn(fake.debugger, 'sendCommand').mockImplementation(async (method) => {
      if (method === 'Input.insertText') throw new Error('disconnected');
      return {};
    });
    await expect(typeBrowserText(webContents, 'e1', 'hello', true)).resolves.toMatchObject({ ok: false });
    expect(fake.executeJavaScript).not.toHaveBeenCalledWith(expect.stringContaining('setter.call'), true);
  });
  it('does not insert text if selecting existing content fails', async () => {
    const { fake, webContents } = setup();
    vi.spyOn(fake, 'executeJavaScript').mockImplementation(async (script) =>
      script.includes('document.activeElement') ? { ok: false } : { ok: true, x: 20, y: 30 }
    );
    await expect(typeBrowserText(webContents, 'e1', 'hello', true)).resolves.toMatchObject({ ok: false });
    expect(fake.debugger.commands.some((command) => command.method === 'Input.insertText')).toBe(false);
  });
  it('scales native coordinates while keeping cursor expectations in page coordinates', async () => {
    const { fake, webContents } = setup();
    setBrowserViewport(webContents, { width: 1280, height: 900 }, 0.5);
    await clickMouseAt(webContents, { x: 1000, y: 300 });
    expect(fake.debugger.commands[0]?.params).toMatchObject({ x: 500, y: 150 });
    expect(fake.executeJavaScript).toHaveBeenCalledWith(expect.stringContaining('"pointerdown", 1000, 300'), true);
    clearBrowserViewport(webContents);
    await clickMouseAt(webContents, { x: 1000, y: 300 });
    expect(fake.debugger.commands[3]?.params).toMatchObject({ x: 1000, y: 300 });
  });

  it('returns unavailable before input when a debugger cannot attach', async () => {
    const { fake, webContents } = setup();
    vi.spyOn(fake.debugger, 'attach').mockImplementation(() => {
      throw new Error('in use');
    });
    await expect(insertTextIn(webContents, 'hello')).resolves.toBe(false);
    await expect(clickMouseAt(webContents, { x: 20, y: 30 })).resolves.toBe(false);
  });
});
