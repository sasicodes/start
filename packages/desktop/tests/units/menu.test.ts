import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderUsage } from '@main/usage/types';
import { applicationMenuTemplate, lastTray, resetFakeMenus, type FakeMenuItem } from '../fakes/electron.js';

vi.mock('@main/application', () => ({
  isMac: true,
  isProd: true,
  appMenuName: 'Start',
  appIconPath: '/icon.png',
  trayIconPath: '/tray.png'
}));

const menuActions = (
  onShowSettings = vi.fn(),
  onShowProviders = vi.fn(),
  providerUsage: ProviderUsage[] | null = null,
  onToggleSettings = vi.fn(),
  onToggleShortcuts = vi.fn()
) => ({
  providerUsage,
  onShowSettings,
  onShowProviders,
  onToggleSettings,
  onToggleShortcuts,
  recentSessions: [],
  onNewSession: vi.fn(),
  onQuickAccess: vi.fn(),
  onShowShortcuts: vi.fn(),
  onCheckForUpdates: vi.fn(),
  onOpenRecentSession: vi.fn(),
  composerShortcut: 'Control+Space'
});

const itemWithLabel = (items: FakeMenuItem[], label: string) => {
  const item = items.find((entry) => entry.label === label);
  if (!item) throw new Error(`Expected ${label} menu item.`);
  return item;
};

describe('menus', () => {
  beforeEach(() => {
    resetFakeMenus();
  });

  it('toggles settings from the application menu without forwarding Electron click arguments', async () => {
    const onToggleSettings = vi.fn();
    const { installApplicationMenu } = await import('@main/menu');

    installApplicationMenu(menuActions(vi.fn(), vi.fn(), null, onToggleSettings));

    const appSubmenu = applicationMenuTemplate()?.[0]?.submenu ?? [];
    const settings = itemWithLabel(appSubmenu, 'Settings');
    if (!settings.click) throw new Error('Expected Settings menu item click handler.');

    settings.click({ label: 'Settings' }, { id: 'window' }, { triggeredByAccelerator: true });

    expect(onToggleSettings).toHaveBeenCalledWith();
    expect(settings.accelerator).toBe('CommandOrControl+,');
  });

  it('toggles the shortcuts tab from the help menu', async () => {
    const onToggleShortcuts = vi.fn();
    const { installApplicationMenu } = await import('@main/menu');

    installApplicationMenu(menuActions(vi.fn(), vi.fn(), null, vi.fn(), onToggleShortcuts));

    const help = (applicationMenuTemplate() ?? []).find((entry) => entry.role === 'help')?.submenu ?? [];
    const shortcuts = itemWithLabel(help, 'Keyboard Shortcuts');
    if (!shortcuts.click) throw new Error('Expected Keyboard Shortcuts menu item click handler.');

    shortcuts.click({ label: 'Keyboard Shortcuts' }, { id: 'window' }, { triggeredByAccelerator: true });

    expect(onToggleShortcuts).toHaveBeenCalledWith();
    expect(shortcuts.accelerator).toBe('CommandOrControl+/');
  });

  it('opens settings from the tray menu without forwarding Electron click arguments', async () => {
    const onShowSettings = vi.fn();
    const onShowProviders = vi.fn();
    const { installStatusItem } = await import('@main/menu');

    installStatusItem(menuActions(onShowSettings, onShowProviders, [{ id: 'openai', remainingPercent: 52 }]));

    const items = lastTray()?.contextMenu ?? [];
    const settings = itemWithLabel(items, 'Settings');
    if (!settings.click) throw new Error('Expected Settings tray item click handler.');

    settings.click({ label: 'Settings' }, { id: 'window' }, { triggeredByAccelerator: true });

    expect(onShowSettings).toHaveBeenCalledWith();
    expect(itemWithLabel(items, 'Usage').enabled).toBe(false);
    const openAi = itemWithLabel(items, 'OpenAI');
    expect(openAi).toMatchObject({ sublabel: '52% remaining' });
    expect(openAi.enabled).not.toBe(false);
    expect(itemWithLabel(items, 'Anthropic')).toMatchObject({ sublabel: 'Unavailable' });

    openAi.click?.();

    expect(onShowProviders).toHaveBeenCalledWith();
  });
});
