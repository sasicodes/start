import type { AppSettingsResult, MobileRelaySettings, ProviderAuthStatus } from '@preload/index';
import { PanelCloseButton } from '@renderer/shared/panel/close';
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
  composerShortcut: string;
  providers: ProviderAuthStatus[];
  solidWindowBackground: boolean;
  onTabChange: (tab: SettingsTab) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onMobileRelayChange: (settings: MobileRelaySettings) => Promise<AppSettingsResult>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
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
    composerShortcut,
    solidWindowBackground,
    onLoginSubscription,
    onMobileRelayChange,
    onDisconnectProvider,
    onComposerShortcutChange,
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
              composerShortcut={composerShortcut}
              translucentBackground={!solidWindowBackground}
              onComposerShortcutChange={onComposerShortcutChange}
              onTranslucentBackgroundChange={updateTranslucency}
            />
          ) : tab === 'providers' ? (
            <Providers
              providers={providers}
              onSaveApiKey={onSaveApiKey}
              onLoginSubscription={onLoginSubscription}
              onDisconnectProvider={onDisconnectProvider}
            />
          ) : tab === 'mobile' ? (
            <Mobile settings={mobileRelay} onChange={onMobileRelayChange} />
          ) : (
            <Shortcuts composerShortcut={composerShortcut} />
          )}
        </div>
      </section>
    );
  }
);
