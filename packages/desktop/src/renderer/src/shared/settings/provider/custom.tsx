import type { CustomProviderConfig } from '@preload/index';
import { ProviderForm, type ProviderFormDraft, emptyProviderFormDraft } from '@renderer/shared/settings/provider/form';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { ChevronDownIcon, CustomProviderIcon, EditIcon, TrashIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'preact/hooks';

const serializeModels = (models: CustomProviderConfig['models']) => models.map((model) => model.id).join('\n');

const splitEntries = (text: string) =>
  text
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? `1 ${singular}` : `${count} ${plural}`;

const summarizeProvider = (provider: CustomProviderConfig) => {
  const models = pluralize(provider.models.length, 'model', 'models');
  const levels = provider.thinkingLabels?.length
    ? ` · ${pluralize(provider.thinkingLabels.length, 'level', 'levels')}`
    : '';
  return `${provider.baseUrl} · ${models}${levels}`;
};

const headerSummary = (providers: CustomProviderConfig[]) => {
  if (providers.length === 0) return 'Add an OpenAI-compatible endpoint';
  const total = providers.reduce((count, provider) => count + provider.models.length, 0);
  return `${providers.length} configured, ${pluralize(total, 'model', 'models')}`;
};

interface CustomProvidersRowProps {
  open: boolean;
  onToggle: () => void;
}

export const CustomProvidersRow = ({ open, onToggle }: CustomProvidersRowProps) => {
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState('');
  const [providers, setProviders] = useState<CustomProviderConfig[]>([]);
  const [draft, setDraft] = useState<ProviderFormDraft>(emptyProviderFormDraft);

  useEffect(() => {
    let active = true;
    window.pi.chat
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
    const thinkingLabels = splitEntries(draft.thinking);
    try {
      await window.pi.chat.saveCustomProvider({
        name: draft.name,
        apiKey: draft.apiKey,
        baseUrl: draft.baseUrl,
        models: splitEntries(draft.modelIds).map((id) => ({ id })),
        ...(thinkingLabels.length > 0 ? { thinkingLabels } : {})
      });
      const next =
        editing && editing !== draft.name.trim()
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
      setProviders(await window.pi.chat.removeCustomProvider(name));
      if (editing === name) resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the provider.');
    }
  };

  const canSubmit =
    draft.name.trim().length > 0 &&
    draft.apiKey.trim().length > 0 &&
    draft.baseUrl.trim().length > 0 &&
    draft.modelIds.trim().length > 0;

  const showAddForm = !editing && adding;
  const showAddButton = !editing && !adding;
  const formProps = { draft, error, canSubmit, onSubmit: submit, onCancel: resetForm, onUpdate: updateDraft };

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
          <p class="m-0 text-xs leading-4 text-soft">{headerSummary(providers)}</p>
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
                      <li key={provider.name} class="rounded-2xl border border-dashed border-line px-3 pt-3 pb-3">
                        <div class="flex min-w-0 items-center gap-3">
                          <div class="min-w-0 flex-1 pl-1">
                            <p class="m-0 truncate text-sm leading-5 font-medium text-ink">{provider.name}</p>
                            <p class="m-0 truncate text-xs leading-4 text-soft">{summarizeProvider(provider)}</p>
                          </div>
                          <div class="flex flex-none items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Edit ${provider.name}`}
                              onClick={() => (isEditing ? resetForm() : startEdit(provider))}
                              class="grid size-7 place-items-center rounded-full border-0 bg-transparent text-soft transition-colors hover:text-ink"
                            >
                              <EditIcon class="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${provider.name}`}
                              onClick={() => remove(provider.name)}
                              class="grid size-7 place-items-center rounded-full border-0 bg-transparent text-soft transition-colors hover:text-danger"
                            >
                              <TrashIcon class="size-4" />
                            </button>
                          </div>
                        </div>
                        <AnimatePresence initial={false}>
                          {isEditing && (
                            <motion.div
                              key="edit-form"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto', transition: openMotionTransition }}
                              exit={{ opacity: 0, height: 0, transition: closeMotionTransition }}
                              class="overflow-hidden"
                            >
                              <div class="mt-5 pb-1">
                                <ProviderForm {...formProps} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              )}

              {showAddForm && (
                <div class="rounded-2xl border border-dashed border-line p-4">
                  <ProviderForm {...formProps} />
                </div>
              )}
              {showAddButton && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  class="h-10 w-full rounded-full border border-dashed border-line bg-transparent px-3 text-sm font-medium text-ink transition-colors hover:border-ink/20"
                >
                  Add custom provider
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
