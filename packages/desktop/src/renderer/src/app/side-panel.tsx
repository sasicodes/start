import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import type { SidePanelMode } from '@renderer/app/types';
import { Settings } from '@renderer/shared/settings/panel';
import { ActivityPanel } from '@renderer/shared/turn/panel';
import { GitChangesPanel } from '@renderer/shared/workspace/changes';
import { memo } from 'preact/compat';

interface AppSidePanelProps {
  mode: SidePanelMode;
  providers: ProviderAuthStatus[];
  turnId: string;
  workspacePath: string;
  composerShortcut: string;
  onLoginSubscription: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
}

export const sidePanelLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'activity') return 'Agent activity';
  return 'Side panel';
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
    onComposerShortcutChange
  }: AppSidePanelProps) => {
    if (mode === 'git') return <GitChangesPanel workspacePath={workspacePath} />;

    if (mode === 'settings') {
      return (
        <Settings
          providers={providers}
          onSaveApiKey={onSaveApiKey}
          composerShortcut={composerShortcut}
          onLoginSubscription={onLoginSubscription}
          onComposerShortcutChange={onComposerShortcutChange}
        />
      );
    }

    if (mode === 'activity') return <ActivityPanel turnId={turnId} />;

    return null;
  }
);
