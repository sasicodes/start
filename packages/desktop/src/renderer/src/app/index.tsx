import type { EffortLevel } from '@preload/index';
import { usePendingAttachments } from '@renderer/app/attachments';
import { useComposerOverlay } from '@renderer/app/composer-overlay';
import { useAppNavigation, routeForSession } from '@renderer/app/navigation';
import { useSessionPanels } from '@renderer/app/panels';
import { useRendererRuntime } from '@renderer/app/runtime';
import { useSessionRouting } from '@renderer/app/session-routing';
import { AppShell } from '@renderer/app/shell';
import { Composer, Settings } from '@renderer/shared/chat/index';
import { useChat } from '@renderer/shared/chat/use-chat';
import { useFileAttachments } from '@renderer/shared/composer/use-file-attachments';
import { ActivityPanel } from '@renderer/shared/turn/panel';
import { GitChangesPanel } from '@renderer/shared/workspace/changes';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { useCallback, useEffect, useRef } from 'preact/hooks';

export const App = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { route, surface, setSurface, navigate, showChat, showSettings } = useAppNavigation(textareaRef);
  const { composerExiting, composerRevealKey, finishComposerExit, completeComposerExit } = useComposerOverlay({
    setSurface,
    textareaRef
  });
  const { attachments, setAttachments, removeAttachment, clearPendingAttachments } = usePendingAttachments();
  const { composerShortcut, updateComposerShortcut } = useRendererRuntime();
  const sessionViewActive = route.name === 'chat' || route.name === 'session';
  const {
    activityTurnId,
    gitPanelVisible,
    clearSidePanels,
    openActivityPanel,
    activityPanelVisible,
    toggleGitChangesPanel
  } = useSessionPanels({ sessionViewActive, surface });

  const {
    send,
    draft,
    models,
    turnCount,
    sendText,
    setDraft,
    saveApiKey,
    selectModel,
    openSession,
    modelsLoaded,
    newSession,
    isGenerating,
    workspacePath,
    thinkingLevel,
    authProviders,
    queuedMessages,
    openSessionId,
    activeSessionId,
    loadedSessionId,
    switchWorkspace,
    refreshSettings,
    selectedModelKey,
    previousUserTurn,
    loginSubscription,
    steerQueuedMessage,
    selectThinkingLevel,
    chooseWorkspaceDirectory
  } = useChat({ onShowChat: showChat, onShowSettings: showSettings, textareaRef });

  const discardComposerDraft = useCallback(() => {
    clearPendingAttachments();
    setDraft('');
  }, [clearPendingAttachments, setDraft]);

  const closeSettings = useCallback(() => {
    setSurface('main');
    navigate(routeForSession(activeSessionId));
    textareaRef.current?.focus();
  }, [activeSessionId, navigate]);

  useEffect(() => {
    return window.pi.app.onDiscardComposer(discardComposerDraft);
  }, [discardComposerDraft]);

  useEffect(() => {
    return window.pi.app.onSubmitComposer((prompt, incomingAttachments) => {
      setSurface('main');
      clearPendingAttachments();
      navigate(routeForSession(activeSessionId), true);
      void sendText(prompt, incomingAttachments);
    });
  }, [activeSessionId, clearPendingAttachments, navigate, sendText]);

  useEffect(() => {
    if (route.name === 'settings') refreshSettings();
  }, [refreshSettings, route.name]);

  const refillPrevious = useCallback(() => {
    setDraft(previousUserTurn);
    textareaRef.current?.focus();
  }, [previousUserTurn, setDraft]);

  const selectModelFromComposer = useCallback(
    (modelKey: string) => {
      void selectModel(modelKey);
    },
    [selectModel]
  );

  const selectThinkingFromComposer = useCallback(
    (level: EffortLevel) => {
      void selectThinkingLevel(level);
    },
    [selectThinkingLevel]
  );

  const chooseWorkspaceFromComposer = useCallback(async () => {
    clearSidePanels();
    await chooseWorkspaceDirectory({ preserveDraft: surface === 'composer' });
  }, [chooseWorkspaceDirectory, clearSidePanels, surface]);

  const selectWorkspaceFromComposer = useCallback(
    (path: string) => {
      clearSidePanels();
      void switchWorkspace(path, { preserveDraft: true });
    },
    [clearSidePanels, switchWorkspace]
  );

  const startNewSession = useCallback(() => {
    void newSession();
    clearPendingAttachments();
    clearSidePanels();
    setSurface('main');
    navigate({ name: 'chat' });
  }, [clearPendingAttachments, clearSidePanels, navigate, newSession, setSurface]);

  const openRecentSession = useSessionRouting({
    route,
    surface,
    navigate,
    openSession,
    openSessionId,
    activeSessionId,
    loadedSessionId,
    clearSidePanels
  });

  const stopResponse = useCallback(() => {
    void window.pi.chat.abort().catch(() => {});
  }, []);

  const submitDraft = useCallback(() => {
    if (!draft.trim() || composerExiting) return;

    const pendingAttachments = attachments;

    if (surface === 'composer') {
      finishComposerExit(() => {
        setAttachments([]);
        void window.pi.app.submitComposer(draft, pendingAttachments).catch(() => {});
        setDraft('');
      });
      return;
    }

    setAttachments([]);
    void send(pendingAttachments);
  }, [attachments, composerExiting, draft, finishComposerExit, send, setDraft, surface]);

  const discardComposerOverlay = useCallback(() => {
    if (surface !== 'composer' || composerExiting) return;
    finishComposerExit(() => {
      void window.pi.app.hideComposer().catch(() => {});
    });
  }, [composerExiting, finishComposerExit, surface]);

  useEffect(() => {
    return window.pi.app.onHideComposerRequest(discardComposerOverlay);
  }, [discardComposerOverlay]);

  const openAttachment = useCallback((path: string) => {
    void window.pi.app.openPath(path).catch(() => {});
  }, []);

  const chooseWorkspaceFromDock = useCallback(() => {
    clearSidePanels();
    void chooseWorkspaceDirectory();
  }, [chooseWorkspaceDirectory, clearSidePanels]);

  const selectWorkspaceFromDock = useCallback(
    (path: string) => {
      clearSidePanels();
      void switchWorkspace(path);
    },
    [clearSidePanels, switchWorkspace]
  );

  const sessionRoutePending = surface === 'main' && route.name === 'session' && loadedSessionId !== route.sessionId;
  const sidePanelVisible = activityPanelVisible || gitPanelVisible;
  const sidePanelLabel = gitPanelVisible ? 'Git changes' : 'Agent activity';
  const sidePanel = gitPanelVisible ? (
    <GitChangesPanel workspacePath={workspacePath} />
  ) : (
    <ActivityPanel turnId={activityTurnId} />
  );

  const fileHandlers = useFileAttachments({
    enabled: sessionViewActive,
    setDraft,
    textareaRef,
    setAttachments
  });

  useAppHotkey(appHotkeys.newChat, () => startNewSession());
  useAppHotkey(appHotkeys.settings, () => showSettings());

  const renderComposer = (overlay: boolean, hasTurns: boolean) => (
    <Composer
      draft={draft}
      models={models}
      attachments={attachments}
      modelsLoaded={modelsLoaded}
      onPaste={fileHandlers.onPaste}
      onStop={stopResponse}
      onSubmit={submitDraft}
      onCancel={discardComposerOverlay}
      onDraftChange={setDraft}
      textareaRef={textareaRef}
      isGenerating={isGenerating}
      thinkingLevel={thinkingLevel}
      queuedMessages={queuedMessages}
      workspacePath={workspacePath}
      overlay={overlay}
      hasTurns={hasTurns}
      exiting={overlay && composerExiting}
      revealKey={overlay ? composerRevealKey : 0}
      onRefillPrevious={refillPrevious}
      selectedModelKey={selectedModelKey}
      previousTurn={previousUserTurn}
      onOpenAttachment={openAttachment}
      onRemoveAttachment={removeAttachment}
      onSteerQueuedMessage={steerQueuedMessage}
      onSelectModel={selectModelFromComposer}
      onOpenSettings={showSettings}
      onExitComplete={completeComposerExit}
      onSelectWorkspace={selectWorkspaceFromComposer}
      onChooseWorkspaceDirectory={chooseWorkspaceFromComposer}
      onSelectThinkingLevel={selectThinkingFromComposer}
    />
  );

  return (
    <AppShell
      route={route}
      surface={surface}
      sidePanel={sidePanel}
      fileHandlers={fileHandlers}
      workspacePath={workspacePath}
      sidePanelLabel={sidePanelLabel}
      onOpenSession={openRecentSession}
      gitPanelVisible={gitPanelVisible}
      activeSessionId={activeSessionId}
      onOpenSettings={showSettings}
      sessionRoutePending={sessionRoutePending}
      onToggleGitPanel={toggleGitChangesPanel}
      sidePanelVisible={sidePanelVisible}
      onChooseDirectory={chooseWorkspaceFromDock}
      onDiscardComposer={discardComposerOverlay}
      sessionViewActive={sessionViewActive}
      onSelectWorkspace={selectWorkspaceFromDock}
      activityPanelTurnId={activityPanelVisible ? activityTurnId : ''}
      onOpenActivityPanel={openActivityPanel}
      onSidePanelCollapse={clearSidePanels}
      settingsView={
        <Settings
          providers={authProviders}
          onClose={closeSettings}
          onSaveApiKey={saveApiKey}
          composerShortcut={composerShortcut}
          onComposerShortcutChange={updateComposerShortcut}
          onLoginSubscription={loginSubscription}
        />
      }
      mainComposer={renderComposer(false, turnCount > 0 || sessionRoutePending)}
      overlayComposer={renderComposer(true, false)}
    />
  );
};
