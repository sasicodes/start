import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { CliInstall } from '@renderer/shared/settings/cli';
import { ComposerShortcut } from '@renderer/shared/settings/composer-shortcut';
import { CustomProvidersRow } from '@renderer/shared/settings/provider/custom';
import { AnthropicIcon, ChevronDownIcon, GeminiIcon, OpenAIIcon } from '@renderer/ui/icons';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';

type ProviderKey = 'anthropic' | 'google' | 'openai';
type AccordionKey = '' | 'custom' | ProviderKey;

const providers: {
  key: ProviderKey;
  name: string;
  supportsSubscription: boolean;
}[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    supportsSubscription: true
  },
  {
    key: 'anthropic',
    name: 'Anthropic',
    supportsSubscription: true
  },
  {
    key: 'google',
    name: 'Google',
    supportsSubscription: false
  }
];

interface SettingsProps {
  composerShortcut: string;
  providers: ProviderAuthStatus[];
  onLoginSubscription: (provider: string) => Promise<void>;
  onDisconnectProvider: (provider: string) => Promise<void>;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
}

const providerStatus = (providers: ProviderAuthStatus[], provider: ProviderKey) =>
  providers.find((status) => status.key === provider);

const ProviderIcon = ({ provider }: { provider: ProviderKey }) => {
  if (provider === 'openai') return <OpenAIIcon class="size-5" />;
  if (provider === 'google') return <GeminiIcon class="size-5" />;
  return <AnthropicIcon class="size-5" />;
};

const ProviderAvatar = ({ provider }: { provider: ProviderKey }) => (
  <div class="grid size-10 flex-none place-items-center rounded-full bg-[linear-gradient(145deg,var(--color-panel),var(--color-control))] text-ink">
    <ProviderIcon provider={provider} />
  </div>
);

interface ProviderHeadingProps {
  name: string;
  connected: boolean;
  authLabel: string;
  authDetail: string;
}

const ProviderHeading = ({ name, connected, authLabel, authDetail }: ProviderHeadingProps) => (
  <div class="min-w-0 flex-1">
    <h3 class="m-0 text-sm leading-5 font-medium text-ink">{name}</h3>
    <p class="m-0 text-xs leading-4 text-soft">
      {connected ? (
        <>
          <span class="text-success">Connected</span>
          {authDetail && <> {authDetail}</>}
        </>
      ) : (
        authLabel
      )}
    </p>
  </div>
);

const connectionDetail = (label: string | undefined): string => (label ?? '').replace(/^Connected\s*/u, '').trim();

export const Settings = memo(
  ({
    onSaveApiKey,
    composerShortcut,
    onLoginSubscription,
    onDisconnectProvider,
    providers: authProviders,
    onComposerShortcutChange
  }: SettingsProps) => {
    const [openProvider, setOpenProvider] = useState<AccordionKey>('');
    const [apiKeys, setApiKeys] = useState<Record<ProviderKey, string>>({ anthropic: '', google: '', openai: '' });

    const toggleProvider = (provider: AccordionKey) => {
      setOpenProvider((current) => (current !== provider ? provider : ''));
    };

    const saveApiKey = async (provider: ProviderKey) => {
      await onSaveApiKey(provider, apiKeys[provider]);
      setApiKeys((current) => ({ ...current, [provider]: '' }));
      setOpenProvider('');
    };

    const loginSubscription = async (provider: ProviderKey) => {
      await onLoginSubscription(provider);
      setOpenProvider('');
    };

    const updateApiKey = (provider: ProviderKey, value: string) => {
      setApiKeys((current) => ({ ...current, [provider]: value }));
    };

    return (
      <section class="min-h-full px-5 py-4 outline-0">
        {providers.map((provider, index) => {
          const auth = providerStatus(authProviders, provider.key);
          const draftKey = apiKeys[provider.key];
          const connected = auth?.connected ?? false;
          const hasCredentials = auth?.hasCredentials ?? true;
          const authLabel = auth?.label ?? 'Checking connection';
          const hasDraftKey = draftKey.trim().length > 0;
          const authDetail = connected ? connectionDetail(auth?.label) : '';
          const expandable = !hasCredentials;
          const open = expandable && openProvider === provider.key;

          return (
            <div class={tw('py-4', index > 0 && 'border-t border-line')} key={provider.key}>
              {expandable ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleProvider(provider.key)}
                  class="flex w-full min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
                >
                  <ProviderAvatar provider={provider.key} />
                  <ProviderHeading
                    name={provider.name}
                    connected={connected}
                    authLabel={authLabel}
                    authDetail={authDetail}
                  />
                  <ChevronDownIcon
                    class={tw('size-4 flex-none text-soft transition-transform duration-150', open && 'rotate-180')}
                  />
                </button>
              ) : (
                <div class="flex min-w-0 items-center gap-3">
                  <ProviderAvatar provider={provider.key} />
                  <ProviderHeading
                    name={provider.name}
                    connected={connected}
                    authLabel={authLabel}
                    authDetail={authDetail}
                  />
                  <button
                    type="button"
                    onClick={() => void onDisconnectProvider(provider.key)}
                    class="h-8 flex-none rounded-full border border-line bg-control px-3 text-xs font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', transition: openMotionTransition }}
                    exit={{ opacity: 0, height: 0, transition: closeMotionTransition }}
                    class="overflow-hidden"
                  >
                    <div class="mt-5 grid gap-2">
                      <div class="relative rounded-full border border-line bg-composer p-1">
                        <input
                          type="password"
                          value={draftKey}
                          onInput={(event) => updateApiKey(provider.key, event.currentTarget.value)}
                          placeholder={`${provider.name} API key`}
                          class="h-8 w-full rounded-full border-0 bg-transparent pr-20 pl-3 text-sm text-ink outline-none placeholder:text-soft"
                        />
                        <button
                          type="button"
                          onClick={() => void saveApiKey(provider.key)}
                          disabled={!hasDraftKey}
                          class="absolute top-1 right-1 h-8 rounded-full border-0 bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
                        >
                          Save
                        </button>
                      </div>
                      {provider.supportsSubscription && (
                        <div class="flex items-center gap-2 px-1 text-xs leading-5 text-soft">
                          <span>or</span>
                          <button
                            type="button"
                            onClick={() => void loginSubscription(provider.key)}
                            class="border-0 bg-transparent p-0 text-xs leading-5 font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
                          >
                            Connect subscription
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <CustomProvidersRow open={openProvider === 'custom'} onToggle={() => toggleProvider('custom')} />

        <ComposerShortcut composerShortcut={composerShortcut} onChange={onComposerShortcutChange} />
        <CliInstall />
      </section>
    );
  }
);
