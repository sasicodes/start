import { Menu } from '@base-ui/react/menu';
import type { EffortLevel, ModelOption, RootItem } from '@preload/index';
import { GenerateButton, ThinkingButton } from '@renderer/shared/composer-controls';
import { effortLevels } from '@renderer/shared/effort';
import { Finder, finderItemId } from '@renderer/shared/finder';
import { activeFinderToken, commandMode, finderTokenPrefix } from '@renderer/shared/input';
import { Models } from '@renderer/shared/models';
import { useFinderItems } from '@renderer/shared/use-finder-items';
import { selectedModelKeyState } from '@renderer/state/chat';
import { OpenAIIcon } from '@renderer/ui/icons';
import { playCycleSound } from '@renderer/ui/sounds';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { cn } from '@renderer/utils/cn';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

type ComposerProps = {
  draft: string;
  onStop: () => void;
  onSubmit: () => void;
  hasMessages: boolean;
  models: ModelOption[];
  isGenerating: boolean;
  previousMessage: string;
  overlay?: boolean;
  thinkingLevel: EffortLevel;
  onRefillPrevious: () => void;
  selectedModelKey: string | undefined;
  onDraftChange: (value: string) => void;
  onSelectModel: (modelKey: string) => void;
  onOpenSettings: () => void;
  onSelectThinkingLevel: (level: EffortLevel) => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
};

const promptPlaceholder = (hasMessages: boolean, commandMode: boolean) => {
  if (commandMode) return 'Run a shell command';
  if (hasMessages) return 'Ask for follow-up changes';
  return 'Ask to plan or work on something';
};

export const Composer = ({
  draft,
  models,
  onStop,
  onSubmit,
  textareaRef,
  hasMessages,
  isGenerating,
  thinkingLevel,
  overlay = false,
  onDraftChange,
  onSelectModel,
  previousMessage,
  onOpenSettings,
  selectedModelKey,
  onRefillPrevious,
  onSelectThinkingLevel
}: ComposerProps) => {
  const isCommandMode = commandMode(draft);
  const activeModelKey = selectedModelKeyState.value ?? selectedModelKey;
  const selectedModel = useMemo(
    () => models.find((model) => model.key === activeModelKey) ?? models[0],
    [models, activeModelKey]
  );
  const selectedModelLabel = selectedModel?.name ?? 'Models';
  const modelEffortLevels = selectedModel?.effortLevels ?? [];
  const availableEfforts = useMemo(
    () => effortLevels.filter((effortLevel) => modelEffortLevels.includes(effortLevel.id)),
    [modelEffortLevels]
  );
  const showThinkingPicker = availableEfforts.length > 0;
  const selectedEffort = useMemo(
    () => availableEfforts.find((level) => level.id === thinkingLevel) ?? availableEfforts[0] ?? effortLevels[0],
    [availableEfforts, thinkingLevel]
  );
  const promptInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [finderPresent, setFinderPresent] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [activeFinderIndex, setActiveFinderIndex] = useState(0);
  const updateTextareaLayout = useCallback((element: HTMLTextAreaElement, value: string) => {
    element.style.height = 'auto';
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    const nextHeight = Math.min(element.scrollHeight, lineHeight * 4.25);
    element.style.height = `${nextHeight}px`;
    setIsMultiline(element.scrollHeight > lineHeight * 1.6 || value.includes('\n'));
  }, []);
  const setPromptInputRef = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      promptInputRef.current = element;
      textareaRef.current = element;
      if (element instanceof HTMLTextAreaElement) updateTextareaLayout(element, draft);
    },
    [draft, textareaRef, updateTextareaLayout]
  );

  const finderToken = useMemo(() => activeFinderToken(draft), [draft]);
  const finderItems = useFinderItems(finderToken);
  const finderQuery = finderToken?.query.trim().toLowerCase() ?? '';
  const filteredFinderItems = useMemo(() => {
    if (!finderQuery) return finderItems;
    return finderItems.filter((item) => item.name.toLowerCase().includes(finderQuery));
  }, [finderItems, finderQuery]);
  const finderVisible = Boolean(finderToken);
  const finderAttached = finderPresent || finderVisible;
  const selectedFinderItem = filteredFinderItems[activeFinderIndex] ?? filteredFinderItems[0];

  useEffect(() => {
    const exactIndex = filteredFinderItems.findIndex((item) => item.name.toLowerCase() === finderQuery);
    setActiveFinderIndex(Math.max(exactIndex, 0));
  }, [filteredFinderItems, finderQuery]);

  useLayoutEffect(() => {
    const element = promptInputRef.current;
    if (!(element instanceof HTMLTextAreaElement)) {
      setIsMultiline(false);
      return;
    }

    updateTextareaLayout(element, draft);
  }, [draft, updateTextareaLayout]);

  const completeFinderItem = (item: RootItem, enterDirectory: boolean) => {
    if (!finderToken) return;

    const suffix = item.type === 'directory' && enterDirectory ? '/' : ' ';
    const nextToken = `${finderTokenPrefix(finderToken.marker)}${item.path}${suffix}`;
    onDraftChange(`${draft.slice(0, finderToken.start)}${nextToken}`);
  };

  const nextEffort = () => {
    if (availableEfforts.length < 2) return;
    const currentIndex = availableEfforts.findIndex((level) => level.id === thinkingLevel);
    const nextIndex = (currentIndex + 1) % availableEfforts.length;
    playCycleSound();
    onSelectThinkingLevel(availableEfforts[nextIndex]?.id ?? selectedEffort.id);
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!draft.trim() && previousMessage) {
      onRefillPrevious();
      return;
    }
    onSubmit();
  };

  const handleDraftInput = (event: InputEvent) => {
    const element = event.currentTarget as HTMLTextAreaElement;
    onDraftChange(element.value);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' && finderToken && filteredFinderItems.length > 0) {
      event.preventDefault();
      setActiveFinderIndex((index) => Math.min(index + 1, filteredFinderItems.length - 1));
      return;
    }

    if (event.key === 'ArrowUp' && finderToken && filteredFinderItems.length > 0) {
      event.preventDefault();
      setActiveFinderIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Escape' && finderToken) {
      event.preventDefault();
      onDraftChange(draft.slice(0, finderToken.start));
      return;
    }

    if (event.key === 'Escape' && overlay) {
      event.preventDefault();
      void window.pi.app.hideComposer();
      return;
    }

    if (event.key === 'Enter' && finderToken && selectedFinderItem) {
      event.preventDefault();
      completeFinderItem(selectedFinderItem, true);
      return;
    }

    if (event.key === 'ArrowUp' && !draft.trim() && previousMessage) {
      event.preventDefault();
      onRefillPrevious();
      return;
    }

    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div
      class={cn(
        'fixed inset-x-0 mx-auto w-full max-w-3xl rounded-2xl px-5',
        overlay && 'top-[calc(50%-28px)]',
        !overlay && hasMessages && 'bottom-4.5',
        !overlay && !hasMessages && 'top-[calc(50%-28px)]'
      )}
    >
      <Finder
        items={filteredFinderItems}
        activePath={selectedFinderItem?.path}
        visible={finderVisible}
        onPresentChange={setFinderPresent}
        onSelect={(item) => completeFinderItem(item, item.type === 'directory')}
      />
      <form
        class={cn(
          'relative z-30 overflow-hidden rounded-3xl border-0 bg-composer [-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag]',
          finderAttached && !isCommandMode && 'shadow-[0_0_0_1px_transparent,0_16px_22px_-18px_oklch(0%_0_0/0.16)]',
          !finderAttached && 'shadow-shell'
        )}
        onMouseDown={(event) => {
          if (overlay) event.stopPropagation();
        }}
        onSubmit={handleSubmit}
      >
        <div
          class={cn(
            'flex min-h-11.5 items-center gap-2 py-1.25 pr-1.5 pl-1.75',
            isMultiline && 'flex-wrap items-end gap-y-1.5 pt-2 pl-2.5'
          )}
        >
          <div class={cn('flex flex-none items-center gap-px', isMultiline && 'order-2')}>
            <div
              class={cn(
                'relative flex h-9.5 items-center bg-control',
                showThinkingPicker && 'rounded-[20px_3px_3px_20px]',
                !showThinkingPicker && 'rounded-full'
              )}
            >
              <Menu.Root modal={false}>
                <CommonTooltip label={selectedModelLabel}>
                  <Menu.Trigger
                    aria-label="Choose model"
                    className="grid h-full w-10 place-items-center rounded-full border-0 bg-transparent text-ink select-none"
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
                    className="z-30"
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

          <textarea
            rows={1}
            value={draft}
            ref={setPromptInputRef}
            role="combobox"
            aria-expanded={Boolean(finderToken)}
            aria-controls="composer-finder"
            aria-autocomplete="list"
            aria-activedescendant={selectedFinderItem ? finderItemId(selectedFinderItem.path) : undefined}
            spellcheck={false}
            autoCorrect="off"
            onInput={handleDraftInput}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            placeholder={promptPlaceholder(hasMessages, isCommandMode)}
            class={cn(
              'block max-h-25.5 min-h-5.75 min-w-0 resize-none overflow-y-auto border-0 bg-transparent px-1 py-0.5 text-sm leading-6 text-ink outline-0 [scrollbar-color:oklch(70%_0.01_264/0.5)_transparent] [scrollbar-width:thin] placeholder:text-soft',
              isMultiline && 'order-1 w-full flex-none rounded-t-3xl',
              !isMultiline && 'flex-1'
            )}
          />
          <div class={cn('relative flex items-center', isMultiline && 'order-2 ml-auto')}>
            <GenerateButton
              draft={draft}
              onStop={onStop}
              commandMode={isCommandMode}
              isGenerating={isGenerating}
              previousMessage={previousMessage}
            />
          </div>
        </div>
      </form>
    </div>
  );
};
