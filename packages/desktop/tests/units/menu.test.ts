import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationMenuTemplate, lastTray, resetFakeMenus, type FakeMenuItem } from '../fakes/electron.js';

vi.mock('@main/application', () => ({
  isMac: true,
  isProd: true,
  appMenuName: 'Start',
  appIconPath: '/icon.png',
  trayIconPath: '/tray.png'
}));

const menuActions = (onShowSettings = vi.fn()) => ({
  onShowSettings,
  recentSessions: [],
  composerShortcut: 'Control+Space',
  onNewSession: vi.fn(),
  onQuickAccess: vi.fn(),
  onShowShortcuts: vi.fn(),
  onCheckForUpdates: vi.fn(),
  onOpenRecentSession: vi.fn()
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

  it('opens settings from the application menu without forwarding Electron click arguments', async () => {
    const onShowSettings = vi.fn();
    const { installApplicationMenu } = await import('@main/menu');

    installApplicationMenu(menuActions(onShowSettings));

    const appSubmenu = applicationMenuTemplate()?.[0]?.submenu ?? [];
    const settings = itemWithLabel(appSubmenu, 'Settings');
    if (!settings.click) throw new Error('Expected Settings menu item click handler.');

    settings.click({ label: 'Settings' }, { id: 'window' }, { triggeredByAccelerator: true });

    expect(onShowSettings).toHaveBeenCalledWith();
  });

  it('opens settings from the tray menu without forwarding Electron click arguments', async () => {
    const onShowSettings = vi.fn();
    const { installStatusItem } = await import('@main/menu');

    installStatusItem(menuActions(onShowSettings));

    const settings = itemWithLabel(lastTray()?.contextMenu ?? [], 'Settings');
    if (!settings.click) throw new Error('Expected Settings tray item click handler.');

    settings.click({ label: 'Settings' }, { id: 'window' }, { triggeredByAccelerator: true });

    expect(onShowSettings).toHaveBeenCalledWith();
  });
});
