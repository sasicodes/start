import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { Personalization } from '@renderer/shared/settings/personalization';
import { Providers } from '@renderer/shared/settings/providers';
import { SettingsTabs, type SettingsTab } from '@renderer/shared/settings/tabs';
import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';

interface SettingsProps {
  composerShortcut: string;
  solidWindowBackground: boolean;
  providers: ProviderAuthStatus[];
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
    composerShortcut,
    onLoginSubscription,
    onDisconnectProvider,
    solidWindowBackground,
    onComposerShortcutChange,
    onSolidWindowBackgroundChange
  }: SettingsProps) => {
    const [tab, setTab] = useState<SettingsTab>('providers');

    const updateTranslucency = (enabled: boolean) => onSolidWindowBackgroundChange(!enabled);

    return (
      <section class="min-h-full px-5 py-3 outline-0">
        <SettingsTabs value={tab} onChange={setTab} />
        {tab === 'providers' ? (
          <Providers
            providers={providers}
            onSaveApiKey={onSaveApiKey}
            onLoginSubscription={onLoginSubscription}
            onDisconnectProvider={onDisconnectProvider}
          />
        ) : (
          <Personalization
            composerShortcut={composerShortcut}
            onComposerShortcutChange={onComposerShortcutChange}
            translucentBackground={!solidWindowBackground}
            onTranslucentBackgroundChange={updateTranslucency}
          />
        )}
      </section>
    );
  }
);
