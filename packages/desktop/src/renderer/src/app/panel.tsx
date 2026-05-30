import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import type { SidePanelMode } from '@renderer/app/types';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserPanel } from '@renderer/shared/browser/panel';
import { Settings } from '@renderer/shared/settings/panel';
import { Shortcuts } from '@renderer/shared/shortcuts/panel';
import { GitChangesPanel } from '@renderer/shared/workspace/changes';
import { memo } from 'preact/compat';

interface AppSidePanelProps {
  mode: SidePanelMode;
  workspacePath: string;
  composerShortcut: string;
  onBrowserUrlOpened: () => void;
  providers: ProviderAuthStatus[];
  browserNavigation: BrowserNavigation;
  onBrowserInspectText: (text: string) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
}

export const sidePanelLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'browser') return 'Browser';
  if (mode === 'shortcuts') return 'Keyboard shortcuts';
  return 'Side panel';
};

export const sidePanelMaxRatio = (mode: SidePanelMode): number | undefined => {
  if (mode === 'settings' || mode === 'shortcuts') return 0.4;
  return;
};

export const AppSidePanel = memo(
  ({
    mode,
    providers,
    workspacePath,
    onSaveApiKey,
    composerShortcut,
    browserNavigation,
    onBrowserUrlOpened,
    onLoginSubscription,
    onBrowserInspectText,
    onDisconnectProvider,
    onComposerShortcutChange
  }: AppSidePanelProps) => {
    if (mode === 'git') return <GitChangesPanel path={workspacePath} />;
    if (mode === 'browser')
      return (
        <BrowserPanel
          navigation={browserNavigation}
          onUrlOpened={onBrowserUrlOpened}
          onInspectText={onBrowserInspectText}
        />
      );

    if (mode === 'settings') {
      return (
        <Settings
          providers={providers}
          onSaveApiKey={onSaveApiKey}
          composerShortcut={composerShortcut}
          onLoginSubscription={onLoginSubscription}
          onDisconnectProvider={onDisconnectProvider}
          onComposerShortcutChange={onComposerShortcutChange}
        />
      );
    }

    if (mode === 'shortcuts') return <Shortcuts composerShortcut={composerShortcut} />;

    return null;
  }
);
