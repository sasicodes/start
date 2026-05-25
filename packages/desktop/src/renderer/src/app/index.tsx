import type { EffortLevel } from '@preload/index';
import { usePendingAttachments } from '@renderer/app/attachments';
import { useBrowserPanel } from '@renderer/app/browser';
import { useComposerOverlay } from '@renderer/app/composer-overlay';
import { routeForSession, useAppNavigation } from '@renderer/app/navigation';
import {
  AppSidePanel,
  sidePanelLabel as getSidePanelLabel,
  sidePanelMaxRatio as getSidePanelMaxRatio
} from '@renderer/app/panel';
import { useRendererRuntime } from '@renderer/app/runtime';
import { useSessionPanels } from '@renderer/app/session/panels';
import { useSessionRoute } from '@renderer/app/session/route';
import { AppShell } from '@renderer/app/shell';
import { prewarmMarkdownRenderer } from '@renderer/markdown';
import { Composer } from '@renderer/shared/chat/index';
import { useChat } from '@renderer/shared/chat/use-chat';
import { useFileAttachments } from '@renderer/shared/composer/use-file-attachments';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { useRef, useEffect, useCallback, useState } from 'preact/hooks';

export const App = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  const { route, surface, setSurface, navigate, showChat } = useAppNavigation(textareaRef);
  const { composerExiting, composerRevealKey, finishComposerExit, completeComposerExit } = useComposerOverlay({
    setSurface,
    textareaRef
  });
  const { attachments, setAttachments, removeAttachment, clearPendingAttachments } = usePendingAttachments();
  const { composerShortcut, updateComposerShortcut } = useRendererRuntime();
  const sessionViewActive = route.name === 'chat' || route.name === 'session';
  const {
    activityTurnId,
    sidePanelVisible,
    gitPanelVisible,
    closeSidePanel,
    openActivityPanel,
    openSettingsPanel,
    openBrowserPanel,
    openShortcutsPanel,
    activityPanelVisible,
    settingsPanelVisible,
    renderedSidePanelMode,
    toggleSettingsPanel,
    toggleGitChangesPanel
  } = useSessionPanels({ sessionViewActive, surface });

  const showSettings = useCallback(() => {
    if (surface === 'composer') {
      void window.pi.app.openSettings().catch(() => {});
      return;
    }

    setSurface('main');
    openSettingsPanel();
  }, [openSettingsPanel, setSurface, surface]);

  const showShortcuts = useCallback(() => {
    if (surface === 'composer') {
      void window.pi.app.openShortcuts().catch(() => {});
      return;
    }

    setSurface('main');
    openShortcutsPanel();
  }, [openShortcutsPanel, setSurface, surface]);

  const browserPanel = useBrowserPanel({ openPanel: openBrowserPanel, setSurface });

  const toggleSettings = useCallback(() => {
    setSurface('main');
    toggleSettingsPanel();
  }, [setSurface, toggleSettingsPanel]);

  const showChatFromEvent = useCallback(() => {
    closeSidePanel();
    showChat();
  }, [closeSidePanel, showChat]);

  const {
    send,
    draft,
    models,
    turnCount,
    sendText,
    setDraft,
    saveApiKey,
    selectModel,
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
    disconnectProvider,
    steerQueuedMessage,
    deleteQueuedMessage,
    selectThinkingLevel,
    chooseWorkspaceDirectory
  } = useChat({ onShowChat: showChatFromEvent, onShowSettings: showSettings, textareaRef });

  const discardComposerDraft = useCallback(() => {
    clearPendingAttachments();
    setDraft('');
  }, [clearPendingAttachments, setDraft]);

  useEffect(() => {
    prewarmMarkdownRenderer();
  }, []);

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
    if (settingsPanelVisible) refreshSettings();
  }, [refreshSettings, settingsPanelVisible]);

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

  const showSwitchedWorkspace = useCallback(
    async (switcher: () => Promise<boolean>) => {
      closeSidePanel();
      setSwitchingWorkspace(true);
      try {
        const switched = await switcher();
        if (switched) navigate({ name: 'chat' }, true);
      } finally {
        setSwitchingWorkspace(false);
      }
    },
    [closeSidePanel, navigate]
  );

  const chooseWorkspaceFromComposer = useCallback(
    () => showSwitchedWorkspace(() => chooseWorkspaceDirectory({ preserveDraft: surface === 'composer' })),
    [chooseWorkspaceDirectory, showSwitchedWorkspace, surface]
  );

  const selectWorkspaceFromComposer = useCallback(
    (path: string) => showSwitchedWorkspace(() => switchWorkspace(path, { preserveDraft: true })),
    [showSwitchedWorkspace, switchWorkspace]
  );

  const startNewSession = useCallback(() => {
    void newSession();
    closeSidePanel();
    clearPendingAttachments();
    setSurface('main');
    navigate({ name: 'chat' });
  }, [clearPendingAttachments, closeSidePanel, navigate, newSession, setSurface]);

  const openRecentSession = useSessionRoute({
    route,
    disabled: switchingWorkspace,
    surface,
    navigate,
    openSessionId,
    activeSessionId,
    loadedSessionId,
    closeSidePanel
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

  const chooseWorkspaceFromDock = useCallback(
    () => showSwitchedWorkspace(chooseWorkspaceDirectory),
    [chooseWorkspaceDirectory, showSwitchedWorkspace]
  );

  const selectWorkspaceFromDock = useCallback(
    (path: string) => showSwitchedWorkspace(() => switchWorkspace(path)),
    [showSwitchedWorkspace, switchWorkspace]
  );

  const sessionRoutePending = surface === 'main' && route.name === 'session' && loadedSessionId !== route.sessionId;
  const noProvidersConfigured = modelsLoaded && models.length === 0;
  const sidePanelLabel = getSidePanelLabel(renderedSidePanelMode);
  const sidePanelMaxRatio = getSidePanelMaxRatio(renderedSidePanelMode);
  const sidePanel = (
    <AppSidePanel
      mode={renderedSidePanelMode}
      providers={authProviders}
      turnId={activityTurnId}
      browserNavigation={browserPanel.navigation}
      workspacePath={workspacePath}
      onSaveApiKey={saveApiKey}
      composerShortcut={composerShortcut}
      onBrowserUrlOpened={browserPanel.clear}
      onLoginSubscription={loginSubscription}
      onDisconnectProvider={disconnectProvider}
      onComposerShortcutChange={updateComposerShortcut}
    />
  );

  const fileHandlers = useFileAttachments({
    enabled: sessionViewActive,
    setDraft,
    textareaRef,
    setAttachments
  });

  useAppHotkey(appHotkeys.newChat, () => startNewSession());
  useAppHotkey(appHotkeys.settings, () => showSettings());
  useAppHotkey(appHotkeys.shortcuts, () => showShortcuts());

  useEffect(() => {
    return window.pi.app.onShowShortcuts(showShortcuts);
  }, [showShortcuts]);

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
      onDeleteQueuedMessage={deleteQueuedMessage}
      onSelectModel={selectModelFromComposer}
      onOpenSettings={showSettings}
      onExitComplete={completeComposerExit}
      onSelectWorkspace={selectWorkspaceFromComposer}
      onChooseWorkspaceDirectory={chooseWorkspaceFromComposer}
      onSelectThinkingLevel={selectThinkingFromComposer}
      noProvidersConfigured={noProvidersConfigured}
    />
  );

  return (
    <AppShell
      surface={surface}
      sidePanel={sidePanel}
      fileHandlers={fileHandlers}
      workspacePath={workspacePath}
      sidePanelLabel={sidePanelLabel}
      {...(sidePanelMaxRatio !== undefined ? { sidePanelMaxRatio } : {})}
      onOpenSession={openRecentSession}
      gitPanelVisible={gitPanelVisible}
      isGenerating={isGenerating}
      activeSessionId={activeSessionId}
      onOpenSettings={toggleSettings}
      sessionRoutePending={sessionRoutePending}
      settingsPanelVisible={settingsPanelVisible}
      onToggleGitPanel={toggleGitChangesPanel}
      sidePanelVisible={sidePanelVisible}
      onChooseDirectory={chooseWorkspaceFromDock}
      onDiscardComposer={discardComposerOverlay}
      sessionViewActive={sessionViewActive}
      onSelectWorkspace={selectWorkspaceFromDock}
      activityPanelTurnId={activityPanelVisible ? activityTurnId : ''}
      onOpenActivityPanel={openActivityPanel}
      onSidePanelCollapse={closeSidePanel}
      mainComposer={renderComposer(false, turnCount > 0 || sessionRoutePending)}
      overlayComposer={renderComposer(true, false)}
    />
  );
};
