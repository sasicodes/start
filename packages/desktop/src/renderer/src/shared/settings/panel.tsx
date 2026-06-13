import type { AppSettingsResult, MobileRelaySettings, ProviderAuthStatus } from '@preload/index';
import { PanelCloseButton } from '@renderer/shared/panel/close';
import { Mcp } from '@renderer/shared/settings/mcp';
import { Mobile } from '@renderer/shared/settings/mobile';
import { Personalization } from '@renderer/shared/settings/personalization';
import { Providers } from '@renderer/shared/settings/providers';
import { Shortcuts } from '@renderer/shared/settings/shortcuts';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import { SettingsTabs } from '@renderer/shared/settings/tabs';
import { memo } from 'preact/compat';

interface SettingsProps {
  tab: SettingsTab;
  onClose: () => void;
  mobileRelay: MobileRelaySettings;
  providers: ProviderAuthStatus[];
  solidWindowBackground: boolean;
  onTabChange: (tab: SettingsTab) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onMobileRelayChange: (settings: MobileRelaySettings) => Promise<AppSettingsResult>;
  onSolidWindowBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Settings = memo(
  ({
    tab,
    onClose,
    providers,
    mobileRelay,
    onTabChange,
    onSaveApiKey,
    solidWindowBackground,
    onLoginSubscription,
    onMobileRelayChange,
    onDisconnectProvider,
    onSolidWindowBackgroundChange
  }: SettingsProps) => {
    const updateTranslucency = (enabled: boolean) => onSolidWindowBackgroundChange(!enabled);

    const tabBody = () => {
      if (tab === 'personalization') {
        return (
          <Personalization
            translucentBackground={!solidWindowBackground}
            onTranslucentBackgroundChange={updateTranslucency}
          />
        );
      }

      if (tab === 'providers') {
        return (
          <Providers
            providers={providers}
            onSaveApiKey={onSaveApiKey}
            onLoginSubscription={onLoginSubscription}
            onDisconnectProvider={onDisconnectProvider}
          />
        );
      }

      if (tab === 'mcp') return <Mcp />;
      if (tab === 'mobile') return <Mobile settings={mobileRelay} onChange={onMobileRelayChange} />;
      return <Shortcuts />;
    };

    return (
      <section class="min-h-full px-4 pt-4 pb-3 outline-0">
        <header class="mb-6 flex items-center justify-between gap-3 text-sm leading-6 font-medium">
          <SettingsTabs value={tab} onChange={onTabChange} />
          <PanelCloseButton onClick={onClose} />
        </header>
        <div>{tabBody()}</div>
      </section>
    );
  }
);
