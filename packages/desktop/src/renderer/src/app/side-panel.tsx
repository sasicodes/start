import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import type { SidePanelMode } from '@renderer/app/types';
import { Settings } from '@renderer/shared/settings/panel';
import { Shortcuts } from '@renderer/shared/shortcuts/panel';
import { ActivityPanel } from '@renderer/shared/turn/panel';
import { GitChangesPanel } from '@renderer/shared/workspace/changes';
import { memo } from 'preact/compat';

interface AppSidePanelProps {
  turnId: string;
  mode: SidePanelMode;
  workspacePath: string;
  composerShortcut: string;
  providers: ProviderAuthStatus[];
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
}

export const sidePanelLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'activity') return 'Agent activity';
  if (mode === 'shortcuts') return 'Keyboard shortcuts';
  return 'Side panel';
};

export const sidePanelMaxRatio = (mode: SidePanelMode): number | undefined => {
  if (mode === 'settings' || mode === 'shortcuts') return 0.4;
  return undefined;
};

export const AppSidePanel = memo(
  ({
    mode,
    turnId,
    providers,
    workspacePath,
    onSaveApiKey,
    composerShortcut,
    onLoginSubscription,
    onDisconnectProvider,
    onComposerShortcutChange
  }: AppSidePanelProps) => {
    if (mode === 'git') return <GitChangesPanel path={workspacePath} />;

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

    if (mode === 'activity') return <ActivityPanel turnId={turnId} />;

    if (mode === 'shortcuts') return <Shortcuts composerShortcut={composerShortcut} />;

    return null;
  }
);
