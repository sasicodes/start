import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import type { SidePanelMode } from '@renderer/app/types';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserPanel } from '@renderer/shared/browser/panel';
import { Settings } from '@renderer/shared/settings/panel';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import { GitChangesPanel } from '@renderer/shared/workspace/changes';
import { memo } from 'preact/compat';

interface AppSidePanelProps {
  mode: SidePanelMode;
  onClose: () => void;
  settingsTab: SettingsTab;
  workspacePath: string;
  providers: ProviderAuthStatus[];
  composerShortcut: string;
  browserNavigation: BrowserNavigation;
  solidWindowBackground: boolean;
  onBrowserUrlOpened: () => void;
  onBrowserInspectText: (text: string) => void;
  onSettingsTabChange: (tab: SettingsTab) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
  onSolidWindowBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const sidePanelLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'browser') return 'Browser';
  return 'Side panel';
};

export const sidePanelMaxRatio = (mode: SidePanelMode) => {
  if (mode === 'settings') return 0.4;
  return;
};

export const AppSidePanel = memo(
  ({
    mode,
    onClose,
    providers,
    settingsTab,
    onSaveApiKey,
    workspacePath,
    browserNavigation,
    composerShortcut,
    onBrowserUrlOpened,
    solidWindowBackground,
    onLoginSubscription,
    onBrowserInspectText,
    onSettingsTabChange,
    onDisconnectProvider,
    onComposerShortcutChange,
    onSolidWindowBackgroundChange
  }: AppSidePanelProps) => {
    if (mode === 'git') return <GitChangesPanel path={workspacePath} onClose={onClose} />;
    if (mode === 'browser')
      return (
        <BrowserPanel
          onClose={onClose}
          navigation={browserNavigation}
          onUrlOpened={onBrowserUrlOpened}
          onInspectText={onBrowserInspectText}
        />
      );

    if (mode === 'settings') {
      return (
        <Settings
          tab={settingsTab}
          onClose={onClose}
          providers={providers}
          composerShortcut={composerShortcut}
          onSaveApiKey={onSaveApiKey}
          onTabChange={onSettingsTabChange}
          solidWindowBackground={solidWindowBackground}
          onLoginSubscription={onLoginSubscription}
          onDisconnectProvider={onDisconnectProvider}
          onComposerShortcutChange={onComposerShortcutChange}
          onSolidWindowBackgroundChange={onSolidWindowBackgroundChange}
        />
      );
    }

    return null;
  }
);
