import type { RootItem } from '@preload/index';
import { AttachmentStack } from '@renderer/shared/composer/attachment-stack';
import { GenerateButton } from '@renderer/shared/composer/generate-button';
import { ComposerModelPicker } from '@renderer/shared/composer/model-picker';
import type { ComposerProps } from '@renderer/shared/composer/types';
import { Finder, finderItemId } from '@renderer/shared/finder';
import { activeFinderToken, commandMode, finderTokenPrefix } from '@renderer/shared/input';
import { usePromptPlaceholder } from '@renderer/shared/placeholder';
import { useFinderItems } from '@renderer/shared/use-finder-items';
import { cn } from '@renderer/utils/cn';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

export const Composer = ({
  draft,
  models,
  attachments,
  modelsLoaded,
  onStop,
  onPaste,
  onSubmit,
  textareaRef,
  hasTurns,
  isGenerating,
  thinkingLevel,
  overlay = false,
  onDraftChange,
  onSelectModel,
  previousTurn,
  onOpenSettings,
  selectedModelKey,
  onRefillPrevious,
  onOpenAttachment,
  onRemoveAttachment,
  onSelectThinkingLevel
}: ComposerProps) => {
  const isCommandMode = commandMode(draft);
  const promptInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [finderPresent, setFinderPresent] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [activeFinderIndex, setActiveFinderIndex] = useState(0);
  const updateTextareaLayout = useCallback((element: HTMLTextAreaElement, value: string) => {
    const hasText = value.trim().length > 0;
    element.style.height = 'auto';
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    const nextHeight = Math.min(element.scrollHeight, lineHeight * 4.25);
    element.style.height = hasText ? `${nextHeight}px` : '';
    setIsMultiline(hasText && (element.scrollHeight > lineHeight * 1.6 || value.includes('\n')));
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
  const hasAttachments = attachments.length > 0;
  const finderAttached = finderPresent || finderVisible;
  const selectedFinderItem = filteredFinderItems[activeFinderIndex] ?? filteredFinderItems[0];
  const centered = overlay || !hasTurns;
  const layered = isMultiline || hasAttachments;
  const promptPlaceholder = usePromptPlaceholder({ centered, draft, hasTurns, isCommandMode });

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

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!draft.trim() && previousTurn) {
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

    if (event.key === 'ArrowUp' && !draft.trim() && previousTurn) {
      event.preventDefault();
      onRefillPrevious();
      return;
    }

    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!draft.trim()) {
      if (previousTurn) onRefillPrevious();
      return;
    }
    onSubmit();
  };

  return (
    <div
      class={cn(
        'fixed inset-x-0 isolate mx-auto w-full max-w-3xl rounded-2xl px-5',
        centered && 'top-[calc(50%-28px)]',
        !overlay && hasTurns && 'bottom-4.5',
        overlay &&
          "before:pointer-events-none before:absolute before:inset-x-10 before:-top-5 before:-bottom-5 before:z-10 before:animate-[composer-shortcut-smoke-in_220ms_cubic-bezier(0.16,1,0.3,1)_both] before:rounded-full before:bg-[radial-gradient(ellipse_at_22%_42%,var(--composer-shortcut-smoke-warm),transparent_48%),radial-gradient(ellipse_at_78%_36%,var(--composer-shortcut-smoke-cool),transparent_52%),radial-gradient(ellipse_at_50%_78%,var(--composer-shortcut-smoke-mist),transparent_58%)] before:blur-2xl before:content-[''] after:pointer-events-none after:absolute after:inset-x-20 after:top-1 after:z-20 after:h-12 after:animate-[composer-shortcut-smoke-in_260ms_cubic-bezier(0.16,1,0.3,1)_both] after:rounded-full after:bg-[linear-gradient(90deg,transparent,var(--composer-shortcut-smoke-sheen),transparent)] after:blur-md after:content-['']"
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
          'relative z-30 overflow-hidden border-0 bg-composer [-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag]',
          layered ? 'rounded-t-2xl rounded-b-3xl' : 'rounded-3xl',
          finderAttached && !isCommandMode && 'shadow-[0_0_0_1px_transparent,0_16px_22px_-18px_oklch(0%_0_0/0.16)]',
          !finderAttached && !overlay && 'shadow-shell',
          !finderAttached &&
            overlay &&
            'shadow-[0_0_0_1px_var(--composer-shortcut-field-ring),0_20px_46px_-28px_var(--composer-shortcut-field-shadow),inset_0_1px_0_var(--composer-shortcut-field-highlight)]'
        )}
        onMouseDown={(event) => {
          if (overlay) event.stopPropagation();
        }}
        onSubmit={handleSubmit}
      >
        <div
          class={cn(
            'flex min-h-11.5 items-center gap-2 py-1.25 pr-1.5 pl-1.25',
            layered && 'flex-wrap items-end gap-y-1.5 px-2.5 pt-2'
          )}
        >
          <ComposerModelPicker
            models={models}
            layered={layered}
            modelsLoaded={modelsLoaded}
            thinkingLevel={thinkingLevel}
            onSelectModel={onSelectModel}
            onOpenSettings={onOpenSettings}
            selectedModelKey={selectedModelKey}
            onSelectThinkingLevel={onSelectThinkingLevel}
          />
          <div class={cn('relative min-w-0', layered && 'order-1 w-full flex-none', !layered && 'flex-1')}>
            {promptPlaceholder.rotating && (
              <div
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 overflow-hidden px-1 py-0.5 text-sm leading-6 text-soft"
              >
                {promptPlaceholder.placeholders.map((text, index) => (
                  <span
                    key={text}
                    style={{
                      animationDelay: `${index * 10}s`,
                      animationDuration: `${promptPlaceholder.placeholders.length * 10}s`,
                      animationIterationCount: 'infinite',
                      animationName: 'composer-placeholder-cycle',
                      animationTimingFunction: 'linear'
                    }}
                    class="absolute inset-x-1 top-0.5 truncate opacity-0"
                  >
                    {text}
                  </span>
                ))}
              </div>
            )}
            <textarea
              rows={1}
              value={draft}
              ref={setPromptInputRef}
              role="combobox"
              aria-label={promptPlaceholder.label}
              aria-expanded={Boolean(finderToken)}
              aria-controls="composer-finder"
              aria-autocomplete="list"
              aria-activedescendant={selectedFinderItem ? finderItemId(selectedFinderItem.path) : undefined}
              spellcheck={false}
              autoCorrect="off"
              onInput={handleDraftInput}
              onPaste={onPaste}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              placeholder={promptPlaceholder.placeholder}
              class="block max-h-25.5 min-h-5.75 w-full min-w-0 resize-none overflow-y-auto border-0 bg-transparent px-1 py-0.5 text-sm leading-6 text-ink outline-0 [scrollbar-color:oklch(70%_0.01_264/0.5)_transparent] [scrollbar-width:thin] placeholder:text-soft"
            />
          </div>
          <div class={cn('relative flex items-center gap-1.5', layered && 'order-2 ml-auto')}>
            <AttachmentStack
              attachments={attachments}
              onOpenAttachment={onOpenAttachment}
              onRemoveAttachment={onRemoveAttachment}
            />
            <GenerateButton
              draft={draft}
              onStop={onStop}
              commandMode={isCommandMode}
              isGenerating={isGenerating}
              previousTurn={previousTurn}
            />
          </div>
        </div>
      </form>
    </div>
  );
};
