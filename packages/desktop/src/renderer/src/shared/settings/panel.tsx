import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { AnthropicIcon, GeminiIcon, OpenAIIcon } from '@renderer/ui/icons';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';

type ProviderKey = 'anthropic' | 'google' | 'openai';

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

const connectionDetail = (label: string | undefined) => label?.replace(/^Connected\s*/u, '').trim();

const modifierLabel = (event: KeyboardEvent) => {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Control');
  if (event.metaKey) modifiers.push('Command');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  return modifiers;
};

const keyLabel = (key: string) => {
  if (key === ' ') return 'Space';
  if (key === 'Escape') return '';
  if (key.length === 1) return key.toUpperCase();
  return key;
};

export const Settings = memo(
  ({
    onSaveApiKey,
    composerShortcut,
    onLoginSubscription,
    onDisconnectProvider,
    providers: authProviders,
    onComposerShortcutChange
  }: SettingsProps) => {
    const [shortcutError, setShortcutError] = useState('');
    const [recordingShortcut, setRecordingShortcut] = useState(false);
    const [apiKeys, setApiKeys] = useState<Record<ProviderKey, string>>({ anthropic: '', google: '', openai: '' });

    const saveApiKey = async (provider: ProviderKey) => {
      await onSaveApiKey(provider, apiKeys[provider]);
      setApiKeys((current) => ({ ...current, [provider]: '' }));
    };

    const updateApiKey = (provider: ProviderKey, value: string) => {
      setApiKeys((current) => ({ ...current, [provider]: value }));
    };

    const recordShortcut = async (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const key = keyLabel(event.key);
      const modifiers = modifierLabel(event);
      if (!key) {
        setRecordingShortcut(false);
        return;
      }

      if (modifiers.length === 0) {
        setShortcutError('Use at least one modifier key.');
        return;
      }

      const shortcut = [...modifiers, key].join('+');
      try {
        const result = await onComposerShortcutChange(shortcut);
        setShortcutError(result.error ?? '');
      } catch {
        setShortcutError('That shortcut could not be saved.');
      }
      setRecordingShortcut(false);
    };

    return (
      <section class="min-h-full px-5 py-4 outline-0">
        {providers.map((provider, index) => {
          const auth = providerStatus(authProviders, provider.key);
          const draftKey = apiKeys[provider.key];
          const connected = auth?.connected ?? false;
          const hasCredentials = auth?.hasCredentials ?? false;
          const authLabel = auth?.label ?? 'Not connected';
          const hasDraftKey = draftKey.trim().length > 0;
          const authDetail = connected ? connectionDetail(auth?.label) : '';

          return (
            <div class={tw('py-4', index > 0 && 'border-t border-line')} key={provider.key}>
              <div class="flex min-w-0 items-center gap-3">
                <div class="grid size-10 flex-none place-items-center rounded-full bg-[linear-gradient(145deg,var(--color-panel),var(--color-control))] text-ink">
                  <ProviderIcon provider={provider.key} />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="m-0 text-sm leading-5 font-medium text-ink">{provider.name}</h3>
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
                <AnimatePresence initial={false}>
                  {hasCredentials && (
                    <motion.button
                      key="disconnect"
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: openMotionTransition }}
                      exit={{ opacity: 0, transition: closeMotionTransition }}
                      onClick={() => void onDisconnectProvider(provider.key)}
                      class="h-8 flex-none rounded-full border border-line bg-control px-3 text-xs font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
                    >
                      Disconnect
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence initial={false}>
                {!hasCredentials && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', transition: openMotionTransition }}
                    exit={{ opacity: 0, height: 0, transition: closeMotionTransition }}
                    class="overflow-hidden"
                  >
                    <div class="mt-3 grid gap-2">
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
                            onClick={() => void onLoginSubscription(provider.key)}
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

        <div class="mt-4 border-t border-line pt-5">
          <div class="flex min-w-0 items-center justify-between gap-4">
            <div class="min-w-0">
              <h2 class="m-0 text-sm leading-5 font-medium text-ink">Composer shortcut</h2>
              <p class="m-0 mt-0.5 text-xs leading-4 text-soft">
                Open the composer from anywhere while Start is running.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShortcutError('');
                setRecordingShortcut(true);
              }}
              onKeyDown={(event) => {
                if (recordingShortcut) void recordShortcut(event);
              }}
              class="h-9 min-w-36 rounded-full border border-line bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
            >
              {recordingShortcut ? 'Recording shortcut' : composerShortcut.replaceAll('+', ' + ')}
            </button>
          </div>
          {shortcutError && <p class="m-0 mt-3 text-xs leading-4 text-danger">{shortcutError}</p>}
        </div>
      </section>
    );
  }
);
