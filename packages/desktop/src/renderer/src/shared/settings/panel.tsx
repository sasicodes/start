import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { Personalization } from '@renderer/shared/settings/personalization';
import { Providers } from '@renderer/shared/settings/providers';
import { Shortcuts } from '@renderer/shared/settings/shortcuts';
import { SettingsTabs, type SettingsTab } from '@renderer/shared/settings/tabs';
import { memo } from 'preact/compat';

interface SettingsProps {
  composerShortcut: string;
  tab: SettingsTab;
  solidWindowBackground: boolean;
  providers: ProviderAuthStatus[];
  onTabChange: (tab: SettingsTab) => void;
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
  onSolidWindowBackgroundChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Settings = memo(
  ({
    providers,
    onSaveApiKey,
    tab,
    composerShortcut,
    onTabChange,
    onLoginSubscription,
    onDisconnectProvider,
    solidWindowBackground,
    onComposerShortcutChange,
    onSolidWindowBackgroundChange
  }: SettingsProps) => {
    const updateTranslucency = (enabled: boolean) => onSolidWindowBackgroundChange(!enabled);

    return (
      <section class="min-h-full px-5 py-3 outline-0">
        <SettingsTabs value={tab} onChange={onTabChange} />
        {tab === 'providers' ? (
          <Providers
            providers={providers}
            onSaveApiKey={onSaveApiKey}
            onLoginSubscription={onLoginSubscription}
            onDisconnectProvider={onDisconnectProvider}
          />
        ) : tab === 'personalization' ? (
          <Personalization
            composerShortcut={composerShortcut}
            onComposerShortcutChange={onComposerShortcutChange}
            translucentBackground={!solidWindowBackground}
            onTranslucentBackgroundChange={updateTranslucency}
          />
        ) : (
          <Shortcuts composerShortcut={composerShortcut} />
        )}
      </section>
    );
  }
);
