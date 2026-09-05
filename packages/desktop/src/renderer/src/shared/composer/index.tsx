import { queuedRecallIds } from '@renderer/shared/chat/recall';
import { Attachments } from '@renderer/shared/composer/attachments';
import { Generate } from '@renderer/shared/composer/generate';
import { Model } from '@renderer/shared/composer/model';
import { Prompt } from '@renderer/shared/composer/prompt';
import { Queue } from '@renderer/shared/composer/queue';
import { editingQueuedId } from '@renderer/shared/composer/queue/state';
import { recallOlderInput } from '@renderer/shared/composer/recall';
import type { ComposerProps } from '@renderer/shared/composer/types';
import { useComposerFinder } from '@renderer/shared/composer/use-finder';
import { useMessageRecall } from '@renderer/shared/composer/use-recall';
import { useComposerTextarea } from '@renderer/shared/composer/use-textarea';
import { Workspace } from '@renderer/shared/composer/workspace';
import { Finder, finderItemId } from '@renderer/shared/finder';
import { Goal } from '@renderer/shared/goal';
import { visibleGoal } from '@renderer/shared/goal/state';
import { useGoalEditor } from '@renderer/shared/goal/use-editor';
import { commandMode } from '@renderer/shared/input';
import { usePromptPlaceholder } from '@renderer/shared/placeholder/use-placeholder';
import { ScrollToBottom } from '@renderer/shared/turn/scroll-to-bottom';
import { composerDockTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useMemo } from 'preact/hooks';

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
    recallMessages,
    workspacePath,
    onOpenSettings,
    onExitComplete,
    onSteerQueuedMessage,
    onSendQueuedMessage,
    onDeleteQueuedMessage,
    onReorderQueuedMessages,
    selectedModelKey,
    onOpenAttachment,
    onRemoveAttachment,
    onSelectWorkspace,
    onSelectThinkingLevel,
    noProvidersConfigured,
    onChooseWorkspaceDirectory
  }: ComposerProps) => {
    const singleLine = overlay;
    const hasAttachments = attachments.length > 0;
    const editor = useGoalEditor({ draft, overlay, hasAttachments, onDraftChange, textareaRef });
    const goalStatus = editor.state.value.status;
    const editingGoal = goalStatus !== 'idle';
    const isCommandMode = !editingGoal && commandMode(draft);
    const { layered, setPromptInputRef } = useComposerTextarea({ draft, singleLine, hasAttachments, textareaRef });

    const {
      finderToken,
      finderItems,
      finderStart,
      finderVisible,
      slashCommandToken,
      selectedFinderKey,
      selectedFinderItem,
      moveFinderSelection,
      completeFinderItem
    } = useComposerFinder(draft, onDraftChange);
    const hasGoal = !overlay && Boolean(visibleGoal.value);
    const attachedVisible = (queuedMessages.length > 0 || hasGoal) && !finderVisible && !isCommandMode;
    const centered = overlay || !hasTurns;
    const promptPlaceholder = usePromptPlaceholder({ draft, hasTurns, isCommandMode });

    const recallQueuedIds = useMemo(() => queuedRecallIds(queuedMessages), [queuedMessages]);
    const recall = useMessageRecall(recallMessages, recallQueuedIds, draft, onDraftChange);

    const submitDraft = () => {
      if (editor.state.peek().status !== 'idle') {
        editor.save();
        return;
      }
      if (!draft.trim() || noProvidersConfigured) return;

      if (editingQueuedId.value) {
        recall.save();
        return;
      }

      onSubmit();
    };

    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      submitDraft();
    };

    const handleDraftInput = (event: InputEvent) => {
      const element = event.currentTarget as HTMLTextAreaElement;
      onDraftChange(singleLine ? element.value.replace(/\r?\n/g, ' ') : element.value);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const holdingGoal = editor.state.peek().status !== 'idle';
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

      if (
        event.key === 'ArrowUp' &&
        !finderVisible &&
        !holdingGoal &&
        recallOlderInput(recallQueuedIds.length > 0, recall.older, () => !overlay && editor.recall())
      ) {
        event.preventDefault();
        return;
      }

      if (event.key === 'ArrowDown' && !finderVisible && !holdingGoal && recall.newer()) {
        event.preventDefault();
        return;
      }

      if (event.key === 'Escape' && (editor.cancel() || recall.cancel())) {
        event.preventDefault();
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

      if (event.key !== 'Enter' || (event.shiftKey && !singleLine)) return;
      event.preventDefault();
      submitDraft();
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
          visible={attachedVisible}
          generating={isGenerating}
          onSteer={onSteerQueuedMessage}
          onSend={onSendQueuedMessage}
          onDelete={onDeleteQueuedMessage}
          onReorder={onReorderQueuedMessages}
        >
          {!overlay && <Goal />}
        </Queue>
        <form
          class={tw(
            'relative z-30 overflow-hidden border-0 bg-composer [-webkit-app-region:no-drag]',
            layered ? 'rounded-t-2xl rounded-b-3xl' : 'rounded-3xl',
            overlay && 'shadow-composer-overlay',
            (finderVisible || attachedVisible) && !isCommandMode && 'shadow-composer-attached',
            !finderVisible && !attachedVisible && !overlay && 'shadow-shell'
          )}
          onMouseDown={(event) => {
            if (overlay) event.stopPropagation();
          }}
          onSubmit={handleSubmit}
        >
          <div class={tw('flex min-h-11.5 items-center gap-2 p-1', layered && 'flex-wrap items-end gap-y-1.5 pt-2')}>
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
                {...(goalStatus !== 'idle' ? { editing: goalStatus } : {})}
                {...(noProvidersConfigured && !editingGoal ? { disabledReason: 'Choose a model' } : {})}
              />
            </div>
          </div>
        </form>
      </motion.div>
    );
  }
);
