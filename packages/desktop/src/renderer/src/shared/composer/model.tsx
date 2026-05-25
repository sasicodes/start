import { Menu } from '@base-ui/react/menu';
import type { EffortLevel, ModelOption } from '@preload/index';
import { Thinking } from '@renderer/shared/composer/thinking';
import { effortLevels } from '@renderer/shared/effort';
import { Models, ProviderIcon, ProviderIconTicker } from '@renderer/shared/models';
import { modelProviderId } from '@renderer/shared/models/provider';
import { selectedModelKeyState } from '@renderer/state/chat';
import { playCycleSound } from '@renderer/ui/sounds';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { useMemo } from 'preact/hooks';

interface ModelProps {
  layered: boolean;
  disabled: boolean;
  models: ModelOption[];
  modelsLoaded: boolean;
  thinkingLevel: EffortLevel;
  onOpenSettings: () => void;
  selectedModelKey: string;
  onSelectModel: (modelKey: string) => void;
  onSelectThinkingLevel: (level: EffortLevel) => void;
}

export const Model = ({
  models,
  layered,
  disabled,
  modelsLoaded,
  thinkingLevel,
  onSelectModel,
  onOpenSettings,
  selectedModelKey,
  onSelectThinkingLevel
}: ModelProps) => {
  const activeModelKey = selectedModelKeyState.value || selectedModelKey;
  const selectedModel = useMemo(
    () => models.find((model) => model.key === activeModelKey) ?? models[0],
    [models, activeModelKey]
  );
  const selectedProviderId = useMemo(
    () => (selectedModel ? modelProviderId(selectedModel) : 'openai'),
    [selectedModel]
  );
  const selectedModelLabel = selectedModel?.name ?? 'Models';
  const hasNoConfiguredModels = modelsLoaded && models.length === 0;
  const modelEffortLevels: EffortLevel[] = selectedModel?.effortLevels ?? effortLevels.map((level) => level.id);
  const availableEfforts = useMemo(
    () => effortLevels.filter((level) => modelEffortLevels.includes(level.id)),
    [modelEffortLevels]
  );
  const selectedEffort = useMemo(
    () => availableEfforts.find((level) => level.id === thinkingLevel) ?? availableEfforts[0] ?? effortLevels[0],
    [availableEfforts, thinkingLevel]
  );

  const nextEffort = () => {
    if (disabled || availableEfforts.length < 2) return;
    const currentIndex = availableEfforts.findIndex((level) => level.id === thinkingLevel);
    const nextIndex = (currentIndex + 1) % availableEfforts.length;
    playCycleSound();
    onSelectThinkingLevel(availableEfforts[nextIndex]?.id ?? selectedEffort.id);
  };

  return (
    <div class={tw('flex flex-none items-center gap-px', layered && 'order-2')}>
      <div class="relative flex items-center h-9.5 rounded-[20px_3px_3px_20px] bg-control">
        <Menu.Root modal={false}>
          <Tooltip label={selectedModelLabel}>
            <Menu.Trigger
              disabled={disabled}
              aria-label="Choose model"
              className="grid place-items-center rounded-full border-0 bg-transparent h-full w-10 text-ink select-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span class="flex-none translate-x-px -translate-y-[0.5px]">
                {hasNoConfiguredModels ? <ProviderIconTicker /> : <ProviderIcon id={selectedProviderId} />}
              </span>
            </Menu.Trigger>
          </Tooltip>
          <Menu.Portal>
            <Menu.Positioner
              side="top"
              align="start"
              sideOffset={12}
              alignOffset={-6}
              className="z-50"
              collisionPadding={12}
            >
              <Models
                models={models}
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                onOpenSettings={onOpenSettings}
              />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <Thinking
        disabled={disabled || availableEfforts.length < 2}
        label={selectedEffort.label}
        level={thinkingLevel}
        onNext={nextEffort}
      />
    </div>
  );
};
