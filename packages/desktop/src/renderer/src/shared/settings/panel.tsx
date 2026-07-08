import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { PanelCloseButton } from '@renderer/shared/panel/close';
import { Personalization } from '@renderer/shared/settings/personalization';
import { Providers } from '@renderer/shared/settings/providers';
import { Remote } from '@renderer/shared/settings/remote';
import { Shortcuts } from '@renderer/shared/settings/shortcuts';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import { SettingsTabs } from '@renderer/shared/settings/tabs';
import { memo } from 'preact/compat';

interface SettingsProps {
  tab: SettingsTab;
  onClose: () => void;
  providers: ProviderAuthStatus[];
  solidWindowBackground: boolean;
  onTabChange: (tab: SettingsTab) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onSolidWindowBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Settings = memo(
  ({
    tab,
    onClose,
    providers,
    onTabChange,
    onSaveApiKey,
    solidWindowBackground,
    onLoginSubscription,
    onDisconnectProvider,
    onSolidWindowBackgroundChange
  }: SettingsProps) => {
    const updateTranslucency = (enabled: boolean) => onSolidWindowBackgroundChange(!enabled);

    return (
      <section class="min-h-full px-4 pt-4 pb-3 outline-0">
        <header class="mb-6 flex items-center justify-between gap-3 text-sm leading-6 font-medium">
          <SettingsTabs value={tab} onChange={onTabChange} />
          <PanelCloseButton onClick={onClose} />
        </header>
        <div>
          {tab === 'personalization' ? (
            <Personalization
              translucentBackground={!solidWindowBackground}
              onTranslucentBackgroundChange={updateTranslucency}
            />
          ) : tab === 'providers' ? (
            <Providers
              providers={providers}
              onSaveApiKey={onSaveApiKey}
              onLoginSubscription={onLoginSubscription}
              onDisconnectProvider={onDisconnectProvider}
            />
          ) : tab === 'remote' ? (
            <Remote />
          ) : (
            <Shortcuts />
          )}
        </div>
      </section>
    );
  }
);
