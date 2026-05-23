import { appIconPath, appMenuName, isMac, trayIconPath } from '@main/application';
import { Menu, nativeImage, shell, Tray } from 'electron';

type MenuActions = {
  onNewSession: () => void;
  onShowSettings: () => void;
};

let tray: Tray | null = null;

const createTrayIcon = () => {
  const icon = nativeImage.createFromPath(trayIconPath);
  const trayIcon = icon.isEmpty() ? nativeImage.createFromPath(appIconPath) : icon;
  const resizedIcon = trayIcon.resize({ width: 18, height: 18 });
  resizedIcon.setTemplateImage(isMac);
  return resizedIcon;
};

export const installStatusItem = ({ onNewSession, onShowSettings }: MenuActions) => {
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
        label: 'Settings',
        accelerator: 'CommandOrControl+,',
        click: onShowSettings
      },
      { type: 'separator' },
      { label: `Quit ${appMenuName}`, role: 'quit' }
    ])
  );
};

export const installApplicationMenu = ({ onNewSession, onShowSettings }: MenuActions) => {
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
            enabled: false
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
          { type: 'separator' },
          { role: 'close' }
        ]
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: [
          {
            label: `${appMenuName} Help`,
            accelerator: 'CommandOrControl+?',
            click: () => void shell.openExternal('https://start.intelligence.one')
          }
        ]
      }
    ])
  );
};
