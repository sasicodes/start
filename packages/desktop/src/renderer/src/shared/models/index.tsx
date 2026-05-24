import type { ModelOption } from '@preload/index';
import { modelProviderId, type ModelProviderId } from '@renderer/shared/models/provider';
import { selectedModelKeyState } from '@renderer/state/chat';
import { AnthropicIcon, CheckIcon, ChevronRightIcon, GearIcon, GeminiIcon, OpenAIIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel, MenuSubmenuTrigger } from '@renderer/ui/menu';
import { useMemo } from 'preact/hooks';

interface ProviderGroup {
  name: string;
  id: ModelProviderId;
  models: ModelOption[];
}

interface ModelsProps {
  models: ModelOption[];
  onOpenSettings: () => void;
  selectedModel: ModelOption | undefined;
  onSelectModel: (modelKey: string) => void;
}

export const ProviderIcon = ({ id }: { id: ModelProviderId }) => {
  if (id === 'openai') return <OpenAIIcon class="size-4" />;
  if (id === 'google') return <GeminiIcon class="size-4" />;
  return <AnthropicIcon class="size-4" />;
};

const ModelCheck = ({ selected }: { selected: boolean }) => {
  if (!selected) return <span class="size-2.5" />;
  return <CheckIcon class="size-2.5 text-hover" />;
};

const ModelOptionItem = ({
  model,
  selected,
  onSelectModel
}: {
  model: ModelOption;
  selected: boolean;
  onSelectModel: (modelKey: string) => void;
}) => {
  const selectModel = () => {
    selectedModelKeyState.value = model.key;
    onSelectModel(model.key);
  };

  return (
    <AppMenu.Item
      onClick={selectModel}
      onPointerDown={selectModel}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
    >
      <span class="block truncate">{model.name}</span>
      <span class="grid size-2.5 place-items-center text-ink">
        <ModelCheck selected={selected} />
      </span>
    </AppMenu.Item>
  );
};

const ModelOptions = ({
  models,
  selectedModel,
  onSelectModel
}: Pick<ProviderGroup, 'models'> & Pick<ModelsProps, 'selectedModel' | 'onSelectModel'>) => {
  return models.map((model) => (
    <ModelOptionItem
      key={model.key}
      model={model}
      selected={selectedModel?.key === model.key}
      onSelectModel={onSelectModel}
    />
  ));
};

const SetupItem = ({ name, onOpenSettings }: Pick<ProviderGroup, 'name'> & Pick<ModelsProps, 'onOpenSettings'>) => {
  return (
    <AppMenu.Item
      onClick={onOpenSettings}
      onPointerDown={onOpenSettings}
      className="grid w-full grid-cols-[auto_1fr] items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
    >
      <GearIcon class="size-4" />
      <span>Set up {name}</span>
    </AppMenu.Item>
  );
};

const ModelMenuContent = ({
  name,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings
}: Pick<ProviderGroup, 'models' | 'name'> & Omit<ModelsProps, 'models'>) => {
  if (models.length === 0) return <SetupItem name={name} onOpenSettings={onOpenSettings} />;

  return <ModelOptions models={models} selectedModel={selectedModel} onSelectModel={onSelectModel} />;
};

const ProviderSubmenu = ({
  id,
  name,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings
}: ProviderGroup & Omit<ModelsProps, 'models'>) => {
  return (
    <AppMenu.SubmenuRoot>
      <MenuSubmenuTrigger>
        <ProviderIcon id={id} />
        <span>{name}</span>
        <ChevronRightIcon class="size-2.5 text-hover" />
      </MenuSubmenuTrigger>
      <AppMenu.Portal>
        <AppMenu.Positioner side="right" align="end" sideOffset={8} className="z-50" collisionPadding={12}>
          <MenuPanel className="w-56">
            <ModelMenuContent
              name={name}
              models={models}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              onOpenSettings={onOpenSettings}
            />
          </MenuPanel>
        </AppMenu.Positioner>
      </AppMenu.Portal>
    </AppMenu.SubmenuRoot>
  );
};

export const Models = ({ models, selectedModel, onSelectModel, onOpenSettings }: ModelsProps) => {
  const providers = useMemo<ProviderGroup[]>(() => {
    const grouped: Record<ModelProviderId, ModelOption[]> = { anthropic: [], google: [], openai: [] };
    for (const model of models) grouped[modelProviderId(model)].push(model);

    return [
      { id: 'openai', name: 'OpenAI', models: grouped.openai },
      { id: 'anthropic', name: 'Anthropic', models: grouped.anthropic },
      { id: 'google', name: 'Google', models: grouped.google }
    ];
  }, [models]);

  return (
    <MenuPanel className="w-44">
      {providers.map((provider) => (
        <ProviderSubmenu
          key={provider.id}
          id={provider.id}
          name={provider.name}
          models={provider.models}
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          onOpenSettings={onOpenSettings}
        />
      ))}
    </MenuPanel>
  );
};
