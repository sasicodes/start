import type { AppSettingsResult, ProviderAuthStatus } from '@preload/index';
import { AnthropicIcon, CheckIcon, OpenAIIcon, XIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import { useEffect, useState } from 'preact/hooks';

type ProviderKey = 'openai' | 'anthropic';

const providers: {
  key: ProviderKey;
  name: string;
}[] = [
  {
    key: 'openai',
    name: 'OpenAI'
  },
  {
    key: 'anthropic',
    name: 'Anthropic'
  }
];

type SettingsProps = {
  providers: ProviderAuthStatus[];
  onClose: () => void;
  composerShortcut: string;
  onSaveApiKey: (provider: string, apiKey: string) => Promise<void>;
  onLoginSubscription: (provider: string) => Promise<void>;
  onComposerShortcutChange: (shortcut: string) => Promise<AppSettingsResult>;
};

const providerStatus = (providers: ProviderAuthStatus[], provider: ProviderKey) =>
  providers.find((status) => status.key === provider);

const ConnectedCheck = ({ connected }: { connected: boolean }) => {
  if (!connected) return null;
  return <CheckIcon class="size-3.5 flex-none text-ink" />;
};

const ProviderIcon = ({ provider }: { provider: ProviderKey }) => {
  if (provider === 'openai') return <OpenAIIcon class="size-5" />;
  return <AnthropicIcon class="size-5" />;
};

const subscriptionLabel = (connected: boolean) => {
  if (connected) return 'Reconnect subscription';
  return 'Connect subscription';
};

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

export const Settings = ({
  providers: authProviders,
  onClose,
  onSaveApiKey,
  composerShortcut,
  onLoginSubscription,
  onComposerShortcutChange
}: SettingsProps) => {
  const [apiKeys, setApiKeys] = useState<Record<ProviderKey, string>>({ anthropic: '', openai: '' });
  const [shortcutError, setShortcutError] = useState('');
  const [recordingShortcut, setRecordingShortcut] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
    const result = await onComposerShortcutChange(shortcut);
    setShortcutError(result.error ?? '');
    setRecordingShortcut(false);
  };

  return (
    <section class="mx-auto size-full max-w-3xl overflow-y-auto px-5 pt-20 pb-16">
      <div class="mb-8 flex items-center justify-between gap-3">
        <h1 class="m-0 text-xl leading-8 font-medium text-ink">Settings</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          class="grid size-9 place-items-center rounded-full border-0 bg-transparent text-ink transition-[background-color,box-shadow] duration-100 ease-in hover:bg-composer hover:shadow-nav"
        >
          <XIcon class="size-4" />
        </button>
      </div>

      {providers.map((provider, index) => {
        const auth = providerStatus(authProviders, provider.key);
        const draftKey = apiKeys[provider.key];
        const hasDraftKey = draftKey.trim().length > 0;
        return (
          <div class={cn('py-4', index > 0 && 'border-t border-line')} key={provider.key}>
            <div class="flex min-w-0 items-center gap-3">
              <div class="grid size-10 flex-none place-items-center rounded-full bg-control text-ink">
                <ProviderIcon provider={provider.key} />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="m-0 flex items-center gap-2 text-sm leading-5 font-medium text-ink">
                  <span>{provider.name}</span>
                  <ConnectedCheck connected={auth?.connected ?? false} />
                </h3>
                <p class="m-0 text-xs leading-4 text-soft">{auth?.label ?? 'Checking'}</p>
              </div>
            </div>

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
              <div class="flex items-center gap-2 px-1 text-xs leading-5 text-soft">
                <span>or</span>
                <button
                  type="button"
                  onClick={() => void onLoginSubscription(provider.key)}
                  class="border-0 bg-transparent p-0 text-xs leading-5 font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
                >
                  {subscriptionLabel(auth?.connected ?? false)}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div class="mt-8 border-t border-line pt-6">
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
};
