import type { CustomProviderConfig } from '@preload/index';
import {
  ProviderForm,
  type ProviderFormDraft,
  emptyProviderFormDraft
} from '@renderer/shared/settings/provider-form';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { ChevronDownIcon, CustomProviderIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'preact/hooks';

const maxThinkingLabels = 4;

const parseThinkingLabels = (text: string): string[] =>
  text
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const serializeModels = (models: CustomProviderConfig['models']) => models.map((model) => model.id).join('\n');

const summarizeProvider = (provider: CustomProviderConfig) => {
  const models = provider.models.length === 1 ? '1 model' : `${provider.models.length} models`;
  const levels = provider.thinkingLabels?.length
    ? ` · ${provider.thinkingLabels.length === 1 ? '1 level' : `${provider.thinkingLabels.length} levels`}`
    : '';
  return `${provider.baseUrl} · ${models}${levels}`;
};

interface CustomProvidersRowProps {
  open: boolean;
  onToggle: () => void;
}


const parseModelIds = (text: string) =>
  text
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((id) => ({ id }));

const summary = (providers: CustomProviderConfig[]) => {
  if (providers.length === 0) return 'Add an OpenAI-compatible endpoint';
  const total = providers.reduce((count, provider) => count + provider.models.length, 0);
  const noun = total === 1 ? 'model' : 'models';
  return `${providers.length} configured, ${total} ${noun}`;
};

export const CustomProvidersRow = ({ open, onToggle }: CustomProvidersRowProps) => {
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState<ProviderFormDraft>(emptyProviderFormDraft);
  const [providers, setProviders] = useState<CustomProviderConfig[]>([]);

  useEffect(() => {
    let active = true;
    void window.pi.chat
      .listCustomProviders()
      .then((next) => {
        if (active) setProviders(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const updateDraft = <K extends keyof ProviderFormDraft>(key: K, value: ProviderFormDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setError('');
    setAdding(false);
    setEditing('');
    setDraft(emptyProviderFormDraft);
  };

  const startEdit = (provider: CustomProviderConfig) => {
    setError('');
    setAdding(true);
    setEditing(provider.name);
    setDraft({
      name: provider.name,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      modelIds: serializeModels(provider.models),
      thinking: provider.thinkingLabels?.join(', ') ?? ''
    });
  };

  const submit = async () => {
    const name = draft.name.trim();
    const baseUrl = draft.baseUrl.trim();
    const apiKey = draft.apiKey.trim();
    const models = parseModelIds(draft.modelIds);
    const thinkingLabels = parseThinkingLabels(draft.thinking);
    if (!name || !baseUrl || !apiKey || models.length === 0) {
      setError('Name, base URL, API key, and at least one model ID are required.');
      return;
    }
    if (thinkingLabels.length > maxThinkingLabels) {
      setError(`Thinking levels supports at most ${maxThinkingLabels} entries.`);
      return;
    }
    try {
      await window.pi.chat.saveCustomProvider({
        name,
        apiKey,
        baseUrl,
        models,
        ...(thinkingLabels.length > 0 ? { thinkingLabels } : {})
      });
      const next =
        editing && editing !== name
          ? await window.pi.chat.removeCustomProvider(editing)
          : await window.pi.chat.listCustomProviders();
      setProviders(next);
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the provider.');
    }
  };

  const remove = async (name: string) => {
    try {
      const next = await window.pi.chat.removeCustomProvider(name);
      setProviders(next);
    } catch {}
  };

  const canSubmit =
    draft.name.trim().length > 0 &&
    draft.apiKey.trim().length > 0 &&
    draft.baseUrl.trim().length > 0 &&
    draft.modelIds.trim().length > 0;

  return (
    <div class="border-t border-line py-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        class="flex w-full min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
      >
        <div class="grid size-10 flex-none place-items-center rounded-full bg-[linear-gradient(145deg,var(--color-panel),var(--color-control))] text-ink">
          <CustomProviderIcon class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="m-0 text-sm leading-5 font-medium text-ink">Custom</h3>
          <p class="m-0 text-xs leading-4 text-soft">{summary(providers)}</p>
        </div>
        <ChevronDownIcon
          class={tw('size-4 flex-none text-soft transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="custom-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: openMotionTransition }}
            exit={{ opacity: 0, height: 0, transition: closeMotionTransition }}
            class="overflow-hidden"
          >
            <div class="mt-5 grid gap-3">
              {providers.length > 0 && (
                <ul class="m-0 grid list-none gap-2 p-0">
                  {providers.map((provider) => {
                    const isEditing = editing === provider.name;
                    return (
                      <li key={provider.name} class="rounded-2xl border border-dashed border-line px-3 py-2">
                        <button
                          type="button"
                          onClick={() => (isEditing ? resetForm() : startEdit(provider))}
                          class="block w-full min-w-0 border-0 bg-transparent p-0 text-left"
                        >
                          <p class="m-0 truncate text-sm leading-5 font-medium text-ink">{provider.name}</p>
                          <p class="m-0 truncate text-xs leading-4 text-soft">{summarizeProvider(provider)}</p>
                        </button>
                        <AnimatePresence initial={false}>
                          {isEditing && (
                            <motion.div
                              key="edit-form"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto', transition: openMotionTransition }}
                              exit={{ opacity: 0, height: 0, transition: closeMotionTransition }}
                              class="overflow-hidden"
                            >
                              <div class="mt-3">
                                <ProviderForm
                                  draft={draft}
                                  error={error}
                                  canSubmit={canSubmit}
                                  secondaryDanger
                                  secondaryLabel="Delete"
                                  onUpdate={updateDraft}
                                  onSubmit={() => void submit()}
                                  onSecondary={() => void remove(provider.name)}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!editing && (
                <div class={tw(providers.length > 0 && 'mt-3 border-t border-line pt-4')}>
                  {adding ? (
                    <div class="rounded-2xl border border-dashed border-line p-3">
                      <ProviderForm
                        draft={draft}
                        error={error}
                        canSubmit={canSubmit}
                        secondaryLabel="Cancel"
                        onUpdate={updateDraft}
                        onSubmit={() => void submit()}
                        onSecondary={resetForm}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      class="h-10 w-full rounded-full border border-dashed border-line bg-transparent px-3 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
                    >
                      + Add custom provider
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
