import { closeSidePanelTab, setSidePanelOpen } from '@main/panel';
import type { BrowserWindow, WebContents } from 'electron';
import { describe, expect, it } from 'vitest';
import { createFakeWebContents, eventsByChannel } from '../fakes/electron.js';

const fakeWindow = () => {
  const webContents = createFakeWebContents();
  return {
    webContents,
    sender: webContents as unknown as WebContents,
    window: { webContents } as unknown as BrowserWindow
  };
};

describe('side panel close input', () => {
  it('lets the window close when no side panel is open', () => {
    const { window, webContents } = fakeWindow();

    expect(closeSidePanelTab(window)).toBe(false);
    expect(eventsByChannel(webContents, 'app:close-panel-tab')).toEqual([]);
  });

  it('closes the focused panel tab instead of the window while a side panel is open', () => {
    const { window, sender, webContents } = fakeWindow();

    setSidePanelOpen(sender, true);

    expect(closeSidePanelTab(window)).toBe(true);
    expect(eventsByChannel(webContents, 'app:close-panel-tab')).toHaveLength(1);
  });

  it('closes the window again once the side panel is closed', () => {
    const { window, sender } = fakeWindow();

    setSidePanelOpen(sender, true);
    setSidePanelOpen(sender, false);

    expect(closeSidePanelTab(window)).toBe(false);
  });

  it('tracks the side panel per window', () => {
    const first = fakeWindow();
    const second = fakeWindow();

    setSidePanelOpen(first.sender, true);

    expect(closeSidePanelTab(second.window)).toBe(false);
    expect(closeSidePanelTab(first.window)).toBe(true);
    expect(eventsByChannel(second.webContents, 'app:close-panel-tab')).toEqual([]);
  });
});
