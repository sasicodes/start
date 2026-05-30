import { Attachments } from '@renderer/shared/composer/attachments';
import { Generate } from '@renderer/shared/composer/generate';
import { Model } from '@renderer/shared/composer/model';
import { Prompt } from '@renderer/shared/composer/prompt';
import { Queue } from '@renderer/shared/composer/queue';
import type { ComposerProps } from '@renderer/shared/composer/types';
import { Workspace } from '@renderer/shared/composer/workspace';
import { Finder, type FinderItem, finderItemId, finderItemKey } from '@renderer/shared/finder';
import { activeFinderToken, activeSlashCommandToken, commandMode, finderTokenPrefix } from '@renderer/shared/input';
import { usePromptPlaceholder } from '@renderer/shared/placeholder/use-placeholder';
import { ScrollToBottom } from '@renderer/shared/turn/scroll-to-bottom';
import { useFinderItems } from '@renderer/shared/finder/use-items';
import { useSlashCommandItems } from '@renderer/shared/slash-commands';
import { composerDockTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

interface FinderSelection {
  index: number;
  query: string;
  items: FinderItem[];
}

export const Composer = memo(
  ({
    draft,
    models,
    attachments,
    modelsLoaded,
    queuedMessages,
    onStop,
    onPaste,
    onSubmit,
    onCancel,
    textareaRef,
    hasTurns,
    isGenerating,
    thinkingLevel,
    exiting = false,
    overlay = false,
    revealKey = 0,
    onDraftChange,
    onSelectModel,
    previousTurn,
    workspacePath,
    onOpenSettings,
    onExitComplete,
    onSteerQueuedMessage,
    onDeleteQueuedMessage,
    selectedModelKey,
    onRefillPrevious,
    onOpenAttachment,
    onRemoveAttachment,
    onSelectWorkspace,
    onSelectThinkingLevel,
    noProvidersConfigured,
    onChooseWorkspaceDirectory
  }: ComposerProps) => {
    const isCommandMode = commandMode(draft);
    const singleLine = overlay;
    const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [isMultiline, setIsMultiline] = useState(false);
    const [finderSelection, setFinderSelection] = useState<FinderSelection>(() => ({ index: 0, items: [], query: '' }));
    const updateTextareaLayout = useCallback((element: HTMLTextAreaElement, value: string) => {
      const hasText = value.trim().length > 0;
      element.style.height = 'auto';
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      const nextHeight = Math.min(element.scrollHeight, lineHeight * 4.25);
      element.style.height = hasText ? `${nextHeight}px` : '';
      setIsMultiline(hasText && (element.scrollHeight > lineHeight * 1.6 || value.includes('\n')));
    }, []);
    const setPromptInputRef = useCallback(
      (element: HTMLTextAreaElement | null) => {
        promptInputRef.current = element;
        textareaRef.current = element;
        if (element && !singleLine) updateTextareaLayout(element, draft);
      },
      [draft, singleLine, textareaRef, updateTextareaLayout]
    );

    const finderToken = useMemo(() => activeFinderToken(draft), [draft]);
    const slashCommandToken = useMemo(() => activeSlashCommandToken(draft), [draft]);
    const fileItems: FinderItem[] = useFinderItems(finderToken);
    const commandItems: FinderItem[] = useSlashCommandItems(slashCommandToken);
    const finderItems: FinderItem[] = slashCommandToken ? commandItems : fileItems;
    const finderQuery = (slashCommandToken?.query ?? finderToken?.query ?? '').trim().toLowerCase();
    const finderStart = slashCommandToken?.start ?? finderToken?.start ?? 0;
    const finderVisible = Boolean(finderToken || slashCommandToken);
    const hasAttachments = attachments.length > 0;
    const queueVisible = queuedMessages.length > 0 && !finderVisible && !isCommandMode;
    const defaultFinderIndex = useMemo(() => {
      const exactIndex = finderItems.findIndex((item) => item.name.toLowerCase() === finderQuery);
      return Math.max(exactIndex, 0);
    }, [finderItems, finderQuery]);
    const activeFinderIndex =
      finderSelection.items === finderItems && finderSelection.query === finderQuery
        ? finderSelection.index
        : defaultFinderIndex;
    const selectedFinderItem = finderItems[activeFinderIndex] ?? finderItems[0];
    const selectedFinderKey = selectedFinderItem ? finderItemKey(selectedFinderItem) : '';
    const centered = overlay || !hasTurns;
    const layered = hasAttachments || (!singleLine && isMultiline);
    const promptPlaceholder = usePromptPlaceholder({ draft, hasTurns, isCommandMode });

    const moveFinderSelection = useCallback(
      (delta: number) => {
        setFinderSelection((current) => {
          const baseIndex =
            current.items === finderItems && current.query === finderQuery ? current.index : defaultFinderIndex;
          return {
            query: finderQuery,
            items: finderItems,
            index: Math.min(Math.max(baseIndex + delta, 0), finderItems.length - 1)
          };
        });
      },
      [defaultFinderIndex, finderItems, finderQuery]
    );

    useLayoutEffect(() => {
      const element = promptInputRef.current;
      if (!element || singleLine) {
        if (element) element.style.height = '';
        setIsMultiline(false);
        return;
      }

      updateTextareaLayout(element, draft);
    }, [draft, singleLine, updateTextareaLayout]);

    const completeFinderItem = (item: FinderItem, enterDirectory: boolean) => {
      if (slashCommandToken) {
        if (item.type !== 'command') return;
        onDraftChange(`${draft.slice(0, slashCommandToken.start)}/${item.name} `);
        return;
      }

      if (!finderToken) return;
      if (item.type === 'command') return;
      if (item.type === 'browser') {
        onDraftChange(`${draft.slice(0, finderToken.start)}${finderTokenPrefix(finderToken.marker)}Browser `);
        return;
      }

      const suffix = item.type === 'directory' && enterDirectory ? '/' : ' ';
      const nextToken = `${finderTokenPrefix(finderToken.marker)}${item.path}${suffix}`;
      onDraftChange(`${draft.slice(0, finderToken.start)}${nextToken}`);
    };

    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      if (!draft.trim() || noProvidersConfigured) return;
      onSubmit();
    };

    const handleDraftInput = (event: InputEvent) => {
      const element = event.currentTarget as HTMLTextAreaElement;
      onDraftChange(singleLine ? element.value.replace(/\r?\n/g, ' ') : element.value);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' && finderVisible && finderItems.length > 0) {
        event.preventDefault();
        moveFinderSelection(1);
        return;
      }

      if (event.key === 'ArrowUp' && finderVisible && finderItems.length > 0) {
        event.preventDefault();
        moveFinderSelection(-1);
        return;
      }

      if (event.key === 'Escape' && overlay) {
        event.preventDefault();
        onCancel?.();
        return;
      }

      if (event.key === 'Escape' && (finderToken || slashCommandToken)) {
        event.preventDefault();
        onDraftChange(draft.slice(0, finderStart));
        return;
      }

      if (event.key === 'Enter' && finderVisible && selectedFinderItem) {
        event.preventDefault();
        completeFinderItem(selectedFinderItem, true);
        return;
      }

      if (event.key === 'ArrowUp' && !draft.trim() && previousTurn) {
        event.preventDefault();
        onRefillPrevious();
        return;
      }

      if (event.key !== 'Enter' || (event.shiftKey && !singleLine)) return;
      event.preventDefault();
      if (!draft.trim() || noProvidersConfigured) return;
      onSubmit();
    };

    return (
      <motion.div
        {...(overlay ? { key: revealKey } : {})}
        {...(!overlay
          ? { layout: 'position' as const, layoutDependency: centered, transition: { layout: composerDockTransition } }
          : {})}
        onAnimationEnd={(event) => {
          if (event.animationName === 'composer-floating-shell-out') onExitComplete();
        }}
        class={tw(
          'inset-x-0 isolate mx-auto w-full max-w-3xl rounded-2xl px-5',
          overlay ? 'fixed' : 'absolute',
          centered && 'top-[calc(50%-28px)]',
          overlay && 'composer-floating-shell [will-change:opacity,transform]',
          overlay && (exiting ? 'animate-composer-overlay-shell-out' : 'animate-composer-overlay-shell-in'),
          !overlay && hasTurns && 'bottom-4.5'
        )}
      >
        {overlay && (
          <Workspace
            workspacePath={workspacePath}
            onSelectWorkspace={onSelectWorkspace}
            onChooseDirectory={onChooseWorkspaceDirectory}
          />
        )}
        {!centered && <ScrollToBottom />}
        <Finder
          items={finderItems}
          visible={finderVisible}
          activeItemKey={selectedFinderKey}
          ariaLabel={slashCommandToken ? 'Slash commands' : 'Project files'}
          onSelect={(item) => completeFinderItem(item, item.type === 'directory')}
          emptyLabel={slashCommandToken ? 'No matching commands' : 'No matching items'}
        />
        <Queue
          messages={queuedMessages}
          visible={queueVisible}
          onSteer={onSteerQueuedMessage}
          onDelete={onDeleteQueuedMessage}
        />
        <form
          class={tw(
            'relative z-30 overflow-hidden border-0 bg-composer [-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag]',
            layered ? 'rounded-t-2xl rounded-b-3xl' : 'rounded-3xl',
            overlay && 'shadow-composer-overlay',
            (finderVisible || queueVisible) && !isCommandMode && 'shadow-composer-attached',
            !finderVisible && !queueVisible && !overlay && 'shadow-shell'
          )}
          onMouseDown={(event) => {
            if (overlay) event.stopPropagation();
          }}
          onSubmit={handleSubmit}
        >
          <div
            class={tw(
              'flex min-h-11.5 items-center gap-2 py-1 pr-1.5 pl-1.25',
              layered && 'flex-wrap items-end gap-y-1.5 px-2.5 pt-2'
            )}
          >
            <Model
              models={models}
              layered={layered}
              disabled={isGenerating}
              modelsLoaded={modelsLoaded}
              thinkingLevel={thinkingLevel}
              onSelectModel={onSelectModel}
              onOpenSettings={onOpenSettings}
              selectedModelKey={selectedModelKey}
              onSelectThinkingLevel={onSelectThinkingLevel}
            />
            <div class={tw('relative min-w-0', layered && 'order-1 w-full flex-none', !layered && 'flex-1')}>
              <Prompt
                draft={draft}
                label={promptPlaceholder.label}
                onPaste={onPaste}
                onInput={handleDraftInput}
                expanded={finderVisible}
                inputRef={setPromptInputRef}
                singleLine={singleLine}
                onKeyDown={handleKeyDown}
                layered={layered}
                placeholder={promptPlaceholder.placeholder}
                {...(selectedFinderKey ? { activeDescendant: finderItemId(selectedFinderKey) } : {})}
              />
            </div>
            <div class={tw('relative flex items-center gap-1.5', layered && 'order-2 ml-auto')}>
              <Attachments
                attachments={attachments}
                onOpenAttachment={onOpenAttachment}
                onRemoveAttachment={onRemoveAttachment}
              />
              <Generate
                draft={draft}
                onStop={onStop}
                commandMode={isCommandMode}
                isGenerating={isGenerating}
                {...(noProvidersConfigured ? { disabledReason: 'Choose a model' } : {})}
              />
            </div>
          </div>
        </form>
      </motion.div>
    );
  }
);
