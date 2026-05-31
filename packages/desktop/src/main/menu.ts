import { isMac, isProd, appIconPath, appMenuName, trayIconPath } from '@main/application';
import type { StatusItemRecentSession } from '@main/types';
import type { MenuItemConstructorOptions, Tray as ElectronTray } from 'electron';
import electron from 'electron';

const { app, Menu, Tray, nativeImage } = electron;
type MenuItemOptions = MenuItemConstructorOptions;

type MenuActions = {
  composerShortcut: string;
  onNewSession: () => void;
  onQuickAccess: () => void;
  onShowSettings: () => void;
  onShowShortcuts: () => void;
  onCheckForUpdates: () => void;
  recentSessions: StatusItemRecentSession[];
  onOpenRecentSession: (id: string) => void;
};

let tray: ElectronTray | null = null;

const createTrayIcon = () => {
  const icon = nativeImage.createFromPath(trayIconPath);
  const trayIcon = icon.isEmpty() ? nativeImage.createFromPath(appIconPath) : icon;
  const resizedIcon = trayIcon.resize({ width: 18, height: 18 });
  resizedIcon.setTemplateImage(isMac);
  return resizedIcon;
};

const truncateMenuLabel = (label: string) => {
  const maxLength = 36;
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3).trimEnd()}...`;
};

const recentSessionItem = (
  session: StatusItemRecentSession,
  onOpenRecentSession: MenuActions['onOpenRecentSession']
): MenuItemOptions => ({
  sublabel: session.workspaceName,
  label: truncateMenuLabel(session.title),
  click: () => onOpenRecentSession(session.id)
});

const recentSessionItems = (
  sessions: StatusItemRecentSession[],
  onOpenRecentSession: MenuActions['onOpenRecentSession']
): MenuItemOptions[] => {
  if (sessions.length === 0) return [];

  const moreSessions = sessions.slice(3);
  const visibleSessions = sessions.slice(0, 3);
  return [
    { type: 'separator' },
    { label: 'Recent', enabled: false },
    ...visibleSessions.map((session) => recentSessionItem(session, onOpenRecentSession)),
    ...(moreSessions.length > 0
      ? [{ label: 'More', submenu: moreSessions.map((session) => recentSessionItem(session, onOpenRecentSession)) }]
      : [])
  ];
};

export const installStatusItem = ({
  onNewSession,
  onQuickAccess,
  onShowSettings,
  recentSessions,
  composerShortcut,
  onOpenRecentSession
}: MenuActions) => {
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
      ...recentSessionItems(recentSessions, onOpenRecentSession),
      { type: 'separator' },
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+,',
        click: onShowSettings
      },
      { label: `Quit ${appMenuName}`, click: () => app.quit() }
    ])
  );
};

export const installApplicationMenu = ({
  onNewSession,
  onQuickAccess,
  onShowSettings,
  onShowShortcuts,
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
      isProd
        ? {
            label: 'View',
            submenu: [
              { role: 'resetZoom' },
              { role: 'zoomIn' },
              { role: 'zoomOut' },
              { type: 'separator' },
              { role: 'togglefullscreen' }
            ]
          }
        : { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: [
          {
            label: 'Keyboard Shortcuts',
            click: onShowShortcuts,
            accelerator: 'CommandOrControl+/'
          }
        ]
      }
    ])
  );
};
