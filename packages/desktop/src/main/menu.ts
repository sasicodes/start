import { isMac, appIconPath, appMenuName, trayIconPath } from '@main/application';
import type { MenuItemConstructorOptions, Tray as ElectronTray } from 'electron';
import electron from 'electron';

const { Menu, Tray, nativeImage } = electron;

type MenuActions = {
  composerShortcut: string;
  onCheckForUpdates: () => void;
  onNewSession: () => void;
  onQuickAccess: () => void;
  onShowSettings: () => void;
};

let tray: ElectronTray | null = null;

const shortcutItem = (label: string, accelerator: string): MenuItemConstructorOptions => ({
  label,
  accelerator,
  enabled: false
});

const shortcutMenu = (composerShortcut: string): MenuItemConstructorOptions[] => [
  shortcutItem('Settings', 'CommandOrControl+,'),
  shortcutItem('Finder next', 'Down'),
  shortcutItem('New session', 'CommandOrControl+N'),
  shortcutItem('Quick access', composerShortcut),
  shortcutItem('Submit prompt', 'Enter'),
  shortcutItem('Finder previous', 'Up'),
  shortcutItem('Prompt new line', 'Shift+Enter'),
  shortcutItem('Toggle side panel', ']'),
  shortcutItem('New session alternate', 'CommandOrControl+T'),
  shortcutItem('Refill previous prompt', 'Up'),
  shortcutItem('Close side panel or popover', 'Esc')
];

const createTrayIcon = () => {
  const icon = nativeImage.createFromPath(trayIconPath);
  const trayIcon = icon.isEmpty() ? nativeImage.createFromPath(appIconPath) : icon;
  const resizedIcon = trayIcon.resize({ width: 18, height: 18 });
  resizedIcon.setTemplateImage(isMac);
  return resizedIcon;
};

export const installStatusItem = ({ onNewSession, onQuickAccess, onShowSettings, composerShortcut }: MenuActions) => {
  if (!tray) {
    tray = new Tray(createTrayIcon());
  }

  tray.setToolTip(appMenuName);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'New Session',
        accelerator: 'CommandOrControl+N',
        click: onNewSession
      },
      {
        label: 'Quick Access',
        accelerator: composerShortcut,
        click: onQuickAccess
      },
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+,',
        click: onShowSettings
      },
      { type: 'separator' },
      { label: `Quit ${appMenuName}`, role: 'quit' }
    ])
  );
};

export const installApplicationMenu = ({
  onNewSession,
  onQuickAccess,
  onShowSettings,
  onCheckForUpdates,
  composerShortcut
}: MenuActions) => {
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: appMenuName,
        submenu: [
          { label: `About ${appMenuName}`, role: 'about' },
          {
            label: 'Check for Updates',
            click: onCheckForUpdates
          },
          { type: 'separator' },
          {
            label: 'Settings',
            click: onShowSettings,
            accelerator: 'CommandOrControl+,'
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { label: `Quit ${appMenuName}`, role: 'quit' }
        ]
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Session',
            accelerator: 'CommandOrControl+N',
            click: onNewSession
          },
          {
            label: 'Quick Access',
            accelerator: composerShortcut,
            click: onQuickAccess
          },
          { type: 'separator' },
          { role: 'close' }
        ]
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: shortcutMenu(composerShortcut)
      }
    ])
  );
};
