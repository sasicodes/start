import { Menu } from '@base-ui/react/menu';
import type { EffortLevel, ModelOption } from '@preload/index';
import { ThinkingButton } from '@renderer/shared/composer/thinking-button';
import { effortLevels } from '@renderer/shared/effort';
import { Models } from '@renderer/shared/models';
import { selectedModelKeyState } from '@renderer/state/chat';
import { OpenAIIcon } from '@renderer/ui/icons';
import { playCycleSound } from '@renderer/ui/sounds';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { cn } from '@renderer/utils/cn';
import { useMemo } from 'preact/hooks';

export const ComposerModelPicker = ({
  models,
  layered,
  modelsLoaded,
  thinkingLevel,
  onSelectModel,
  onOpenSettings,
  selectedModelKey,
  onSelectThinkingLevel
}: {
  layered: boolean;
  models: ModelOption[];
  modelsLoaded: boolean;
  thinkingLevel: EffortLevel;
  onOpenSettings: () => void;
  selectedModelKey: string;
  onSelectModel: (modelKey: string) => void;
  onSelectThinkingLevel: (level: EffortLevel) => void;
}) => {
  const activeModelKey = selectedModelKeyState.value || selectedModelKey;
  const selectedModel = useMemo(
    () => models.find((model) => model.key === activeModelKey) ?? models[0],
    [models, activeModelKey]
  );
  const selectedModelLabel = selectedModel?.name ?? 'Models';
  const modelEffortLevels: EffortLevel[] =
    selectedModel?.effortLevels ?? (!modelsLoaded ? effortLevels.map((level) => level.id) : []);
  const availableEfforts = useMemo(
    () => effortLevels.filter((level) => modelEffortLevels.includes(level.id)),
    [modelEffortLevels]
  );
  const showThinkingPicker = availableEfforts.length > 0;
  const selectedEffort = useMemo(
    () => availableEfforts.find((level) => level.id === thinkingLevel) ?? availableEfforts[0] ?? effortLevels[0],
    [availableEfforts, thinkingLevel]
  );

  const nextEffort = () => {
    if (availableEfforts.length < 2) return;
    const currentIndex = availableEfforts.findIndex((level) => level.id === thinkingLevel);
    const nextIndex = (currentIndex + 1) % availableEfforts.length;
    playCycleSound();
    onSelectThinkingLevel(availableEfforts[nextIndex]?.id ?? selectedEffort.id);
  };

  return (
    <div class={cn('flex flex-none items-center gap-px', layered && 'order-2')}>
      <div
        class={cn(
          'relative flex items-center bg-control',
          showThinkingPicker && 'h-9.5 rounded-[20px_3px_3px_20px]',
          !showThinkingPicker && 'size-9.5 rounded-full'
        )}
      >
        <Menu.Root modal={false}>
          <CommonTooltip label={selectedModelLabel}>
            <Menu.Trigger
              aria-label="Choose model"
              className={cn(
                'grid place-items-center rounded-full border-0 bg-transparent text-ink select-none',
                showThinkingPicker && 'h-full w-10',
                !showThinkingPicker && 'size-9.5'
              )}
            >
              <OpenAIIcon class="size-4 flex-none translate-x-px -translate-y-[0.5px]" />
            </Menu.Trigger>
          </CommonTooltip>
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
      <ThinkingButton
        label={selectedEffort.label}
        level={thinkingLevel}
        visible={showThinkingPicker}
        onNext={nextEffort}
      />
    </div>
  );
};
