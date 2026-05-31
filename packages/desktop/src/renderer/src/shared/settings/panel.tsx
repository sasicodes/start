import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { PanelCloseButton } from '@renderer/shared/panel/close';
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
  onClose: () => void;
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
    onClose,
    onLoginSubscription,
    onDisconnectProvider,
    solidWindowBackground,
    onComposerShortcutChange,
    onSolidWindowBackgroundChange
  }: SettingsProps) => {
    const updateTranslucency = (enabled: boolean) => onSolidWindowBackgroundChange(!enabled);

    return (
      <section class="min-h-full px-4 pt-4 pb-3 outline-0">
        <header class="mb-3 flex items-center justify-between gap-3">
          <SettingsTabs value={tab} onChange={onTabChange} />
          <PanelCloseButton onClick={onClose} />
        </header>
        <div class="pt-2">
          {tab === 'personalization' ? (
            <Personalization
              composerShortcut={composerShortcut}
              onComposerShortcutChange={onComposerShortcutChange}
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
          ) : (
            <Shortcuts composerShortcut={composerShortcut} />
          )}
        </div>
      </section>
    );
  }
);
