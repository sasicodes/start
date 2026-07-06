import type { ModelOption } from '@preload/index';
import { flyoutRisePx } from '@renderer/shared/animation';
import { type ModelProviderId, modelProviderId } from '@renderer/shared/models/provider';
import { providerSettingsTab, type SettingsTab } from '@renderer/shared/settings/tab';
import { selectedModelKeyState } from '@renderer/state/chat';
import { AnthropicIcon, CheckIcon, ChevronRightIcon, OpenAIIcon, SettingsIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel, MenuSurface } from '@renderer/ui/menu';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

interface ProviderGroup {
  name: string;
  id: ModelProviderId;
  models: ModelOption[];
}

type MenuKeyHandler = (event: KeyboardEvent) => void;

interface ModelsProps {
  models: ModelOption[];
  onOpenSettings: (tab?: SettingsTab) => void;
  selectedModel: ModelOption | undefined;
  onSelectModel: (modelKey: string) => void;
}

export const ProviderIcon = ({ id }: { id: ModelProviderId }) => {
  if (id === 'openai') return <OpenAIIcon class="size-4" />;
  return <AnthropicIcon class="size-4" />;
};

const tickerProviders: ModelProviderId[] = ['anthropic', 'openai'];
const tickerIntervalMs = 1500;

export const ProviderIconTicker = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % tickerProviders.length);
    }, tickerIntervalMs);
    return () => window.clearInterval(id);
  }, []);

  const provider = tickerProviders[index] ?? 'anthropic';

  return (
    <span class="relative grid size-4 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={provider}
          class="absolute inset-0 grid place-items-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ ease: 'easeOut', duration: 0.35 }}
        >
          <ProviderIcon id={provider} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

const ModelOptionItem = ({
  model,
  selected,
  onSelectModel,
  onExitFlyout
}: {
  model: ModelOption;
  selected: boolean;
  onSelectModel: (modelKey: string) => void;
  onExitFlyout: MenuKeyHandler;
}) => {
  const selectModel = () => {
    selectedModelKeyState.value = model.key;
    onSelectModel(model.key);
  };

  return (
    <AppMenu.Item
      onClick={selectModel}
      onPointerDown={selectModel}
      onKeyDown={onExitFlyout}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
    >
      <span class="block truncate">{model.name}</span>
      <span class="grid size-2.5 place-items-center text-ink">
        {selected && <CheckIcon class="size-2.5 text-hover" />}
      </span>
    </AppMenu.Item>
  );
};

const ModelOptions = ({
  models,
  selectedModel,
  onSelectModel,
  onExitFlyout
}: Pick<ProviderGroup, 'models'> &
  Pick<ModelsProps, 'selectedModel' | 'onSelectModel'> & {
    onExitFlyout: MenuKeyHandler;
  }) => {
  return models.map((model) => (
    <ModelOptionItem
      key={model.key}
      model={model}
      selected={selectedModel?.key === model.key}
      onSelectModel={onSelectModel}
      onExitFlyout={onExitFlyout}
    />
  ));
};

const SetupItem = ({
  name,
  onOpenSettings,
  onExitFlyout
}: Pick<ProviderGroup, 'name'> &
  Pick<ModelsProps, 'onOpenSettings'> & {
    onExitFlyout: MenuKeyHandler;
  }) => {
  const openProviderSettings = () => onOpenSettings(providerSettingsTab);

  return (
    <AppMenu.Item
      onClick={openProviderSettings}
      onPointerDown={openProviderSettings}
      onKeyDown={onExitFlyout}
      className="grid w-full grid-cols-[auto_1fr] items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
    >
      <SettingsIcon class="size-4" />
      <span>Set up {name}</span>
    </AppMenu.Item>
  );
};

const ModelMenuContent = ({
  name,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  onExitFlyout
}: Pick<ProviderGroup, 'models' | 'name'> &
  Omit<ModelsProps, 'models'> & {
    onExitFlyout: MenuKeyHandler;
  }) => {
  if (models.length === 0) {
    return <SetupItem name={name} onOpenSettings={onOpenSettings} onExitFlyout={onExitFlyout} />;
  }

  return (
    <ModelOptions
      models={models}
      selectedModel={selectedModel}
      onSelectModel={onSelectModel}
      onExitFlyout={onExitFlyout}
    />
  );
};

interface ProviderRowProps extends Pick<ProviderGroup, 'id' | 'name'> {
  active: boolean;
  onActivate: () => void;
  onEnterFlyout: MenuKeyHandler;
}

const ProviderRow = ({ id, name, active, onActivate, onEnterFlyout }: ProviderRowProps) => {
  return (
    <AppMenu.Item
      closeOnClick={false}
      onFocus={onActivate}
      onClick={onActivate}
      onMouseEnter={onActivate}
      onKeyDown={onEnterFlyout}
      className={tw(
        'grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control',
        active && 'bg-control'
      )}
    >
      <ProviderIcon id={id} />
      <span>{name}</span>
      <ChevronRightIcon class="size-2.5 text-hover" />
    </AppMenu.Item>
  );
};

const providerRowStep = 36;

const providerOrder: ModelProviderId[] = ['openai', 'anthropic'];

export const Models = ({ models, selectedModel, onSelectModel, onOpenSettings }: ModelsProps) => {
  const [active, setActive] = useState(() =>
    Math.max(0, selectedModel ? providerOrder.indexOf(modelProviderId(selectedModel)) : 0)
  );
  const rowsRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const enterFlyout = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    flyoutRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  };

  const exitFlyout = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft') return;
    event.preventDefault();
    event.stopPropagation();
    rowsRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[active]?.focus();
  };

  const providers = useMemo<ProviderGroup[]>(() => {
    const grouped: Record<ModelProviderId, ModelOption[]> = { openai: [], anthropic: [] };
    for (const model of models) grouped[modelProviderId(model)].push(model);

    return [
      { id: 'openai', name: 'OpenAI', models: grouped.openai },
      { id: 'anthropic', name: 'Anthropic', models: grouped.anthropic }
    ];
  }, [models]);

  const flyout = providers[active];

  return (
    <MenuPanel className="relative w-44" finalFocus={false}>
      <div ref={rowsRef}>
        {providers.map((provider, index) => (
          <ProviderRow
            key={provider.id}
            id={provider.id}
            name={provider.name}
            active={index === active}
            onActivate={() => setActive(index)}
            onEnterFlyout={enterFlyout}
          />
        ))}
      </div>
      {flyout && (
        <div
          ref={flyoutRef}
          style={
            { '--flyout-rise': `${flyoutRisePx(providers.length, active, providerRowStep)}px` } as JSX.CSSProperties
          }
          class="absolute bottom-1 left-full ml-2 w-56 -translate-y-(--flyout-rise)"
        >
          <MenuSurface>
            <ModelMenuContent
              name={flyout.name}
              models={flyout.models}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              onOpenSettings={onOpenSettings}
              onExitFlyout={exitFlyout}
            />
          </MenuSurface>
        </div>
      )}
    </MenuPanel>
  );
};
