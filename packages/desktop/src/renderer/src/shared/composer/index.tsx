import { AttachmentStack } from '@renderer/shared/composer/attachment-stack';
import { GenerateButton } from '@renderer/shared/composer/generate-button';
import { ComposerModelPicker } from '@renderer/shared/composer/model-picker';
import { PromptControl } from '@renderer/shared/composer/prompt-control';
import { Queue } from '@renderer/shared/composer/queue';
import type { ComposerProps } from '@renderer/shared/composer/types';
import { ComposerWorkspacePicker } from '@renderer/shared/composer/workspace-picker';
import { Finder, type FinderItem, finderItemId } from '@renderer/shared/finder';
import { activeFinderToken, activeSkillToken, commandMode, finderTokenPrefix } from '@renderer/shared/input';
import { usePromptPlaceholder } from '@renderer/shared/placeholder';
import { useFinderItems } from '@renderer/shared/use-finder-items';
import { useSkillItems } from '@renderer/shared/skills';
import { composerDockTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

interface FinderSelection {
  items: FinderItem[];
  query: string;
  index: number;
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
    const skillToken = useMemo(() => activeSkillToken(draft), [draft]);
    const fileItems: FinderItem[] = useFinderItems(finderToken);
    const skillItems: FinderItem[] = useSkillItems(skillToken);
    const finderItems: FinderItem[] = skillToken ? skillItems : fileItems;
    const finderQuery = skillToken?.query.trim().toLowerCase() ?? finderToken?.query.trim().toLowerCase() ?? '';
    const finderVisible = Boolean(finderToken || skillToken);
    const queueVisible = queuedMessages.length > 0 && !finderVisible && !isCommandMode;
    const hasAttachments = attachments.length > 0;
    const defaultFinderIndex = useMemo(() => {
      const exactIndex = finderItems.findIndex((item) => item.name.toLowerCase() === finderQuery);
      return Math.max(exactIndex, 0);
    }, [finderItems, finderQuery]);
    const activeFinderIndex =
      finderSelection.items === finderItems && finderSelection.query === finderQuery
        ? finderSelection.index
        : defaultFinderIndex;
    const selectedFinderItem = finderItems[activeFinderIndex] ?? finderItems[0];
    const centered = overlay || !hasTurns;
    const layered = hasAttachments || (!singleLine && isMultiline);
    const promptPlaceholder = usePromptPlaceholder({ centered, draft, hasTurns, isCommandMode });

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
      if (skillToken) {
        onDraftChange(`${draft.slice(0, skillToken.start)}/${item.path} `);
        return;
      }

      if (!finderToken) return;

      const suffix = item.type === 'directory' && enterDirectory ? '/' : ' ';
      const nextToken = `${finderTokenPrefix(finderToken.marker)}${item.path}${suffix}`;
      onDraftChange(`${draft.slice(0, finderToken.start)}${nextToken}`);
    };

    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      if (!draft.trim()) return;
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

      if (event.key === 'Escape' && (finderToken || skillToken)) {
        event.preventDefault();
        onDraftChange(draft.slice(0, (skillToken ?? finderToken)?.start ?? 0));
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
      if (!draft.trim()) return;
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
          <ComposerWorkspacePicker
            workspacePath={workspacePath}
            onSelectWorkspace={onSelectWorkspace}
            onChooseDirectory={onChooseWorkspaceDirectory}
          />
        )}
        <Finder
          items={finderItems}
          emptyLabel={skillToken ? 'No matching skills' : 'No matching items'}
          activePath={selectedFinderItem?.path}
          visible={finderVisible}
          ariaLabel={skillToken ? 'Skills' : 'Project files'}
          onSelect={(item) => completeFinderItem(item, item.type === 'directory')}
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
            <div class={tw('relative min-w-0', layered && 'order-1 w-full flex-none', !layered && 'flex-1')}>
              <PromptControl
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
                {...(selectedFinderItem ? { activeDescendant: finderItemId(selectedFinderItem.path) } : {})}
              />
            </div>
            <div class={tw('relative flex items-center gap-1.5', layered && 'order-2 ml-auto')}>
              <AttachmentStack
                attachments={attachments}
                onOpenAttachment={onOpenAttachment}
                onRemoveAttachment={onRemoveAttachment}
              />
              <GenerateButton draft={draft} onStop={onStop} commandMode={isCommandMode} isGenerating={isGenerating} />
            </div>
          </div>
        </form>
      </motion.div>
    );
  }
);
