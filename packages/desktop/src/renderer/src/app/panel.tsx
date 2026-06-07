import type { AppSettingsResult, MobileRelaySettings, ProviderAuthStatus } from '@preload/index';
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
  mobileRelay: MobileRelaySettings;
  providers: ProviderAuthStatus[];
  browserNavigation: BrowserNavigation;
  solidWindowBackground: boolean;
  onBrowserUrlOpened: () => void;
  onBrowserInspectText: (text: string) => void;
  onSettingsTabChange: (tab: SettingsTab) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onMobileRelayChange: (settings: MobileRelaySettings) => Promise<AppSettingsResult>;
  onSolidWindowBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const AppSidePanel = memo(
  ({
    mode,
    onClose,
    providers,
    settingsTab,
    mobileRelay,
    onSaveApiKey,
    workspacePath,
    browserNavigation,
    onBrowserUrlOpened,
    solidWindowBackground,
    onLoginSubscription,
    onBrowserInspectText,
    onMobileRelayChange,
    onSettingsTabChange,
    onDisconnectProvider,
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
          mobileRelay={mobileRelay}
          onSaveApiKey={onSaveApiKey}
          onTabChange={onSettingsTabChange}
          solidWindowBackground={solidWindowBackground}
          onLoginSubscription={onLoginSubscription}
          onMobileRelayChange={onMobileRelayChange}
          onDisconnectProvider={onDisconnectProvider}
          onSolidWindowBackgroundChange={onSolidWindowBackgroundChange}
        />
      );
    }

    return null;
  }
);
