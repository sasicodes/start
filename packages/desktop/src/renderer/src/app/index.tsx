import type { EffortLevel } from '@preload/index';
import { usePendingAttachments } from '@renderer/app/attachments';
import { useBrowserPanel } from '@renderer/app/browser';
import { useComposerOverlay } from '@renderer/app/composer-overlay';
import { routeForSession, useAppNavigation } from '@renderer/app/navigation';
import { AppSidePanel } from '@renderer/app/panel';
import { useRendererRuntime } from '@renderer/app/runtime';
import { useSessionPanels } from '@renderer/app/session/panels';
import { useSessionRoute } from '@renderer/app/session/route';
import { AppShell } from '@renderer/app/shell';
import { sidePanelModeLabel, sidePanelModeMaxRatio, sidePanelModeResizable } from '@renderer/app/utils/panel';
import { prewarmMarkdownRenderer } from '@renderer/markdown';
import { appendInspectToDraft } from '@renderer/shared/browser/inspect-draft';
import { Composer } from '@renderer/shared/chat/index';
import { useChat } from '@renderer/shared/chat/use-chat';
import { useFileAttachments } from '@renderer/shared/composer/use-file-attachments';
import { newSessionMention } from '@renderer/shared/input';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import { canSelectWorkspace } from '@renderer/shared/workspace/select';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export const App = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  const { route, surface, setSurface, navigate, showChat } = useAppNavigation(textareaRef);
  const { composerExiting, composerRevealKey, finishComposerExit, completeComposerExit } = useComposerOverlay({
    setSurface,
    textareaRef
  });
  const { attachments, setAttachments, removeAttachment, clearPendingAttachments } = usePendingAttachments();
  const { mobileRelay, solidWindowBackground, updateMobileRelay, updateSolidWindowBackground } = useRendererRuntime();
  const sessionViewActive = route.name === 'chat' || route.name === 'session';
  const {
    sidePanelMode,
    sidePanelVisible,
    gitPanelVisible,
    closeSidePanel,
    openSettingsPanel,
    openBrowserPanel,
    openShortcutsPanel,
    settingsTab,
    setSettingsTab,
    settingsPanelVisible,
    toggleSettingsPanel,
    toggleGitChangesPanel
  } = useSessionPanels({ surface });

  const showSettings = useCallback(
    (tab: SettingsTab = 'personalization') => {
      if (surface === 'composer') {
        window.pi.app.openSettings(tab).catch(() => {});
        return;
      }

      setSurface('main');
      openSettingsPanel(tab);
    },
    [openSettingsPanel, setSurface, surface]
  );

  const showShortcuts = useCallback(() => {
    if (surface === 'composer') {
      window.pi.app.openShortcuts().catch(() => {});
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
    startSession,
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
    recallMessages,
    selectedModelKey,
    loginSubscription,
    disconnectProvider,
    steerQueuedMessage,
    deleteQueuedMessage,
    editQueuedMessage,
    selectThinkingLevel,
    reorderQueuedMessages,
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
      const mention = newSessionMention(prompt);
      if (mention) {
        if (mention.prompt) void startSession(mention.prompt, incomingAttachments);
        return;
      }
      navigate(routeForSession(activeSessionId), true);
      void sendText(prompt, incomingAttachments);
    });
  }, [activeSessionId, clearPendingAttachments, navigate, sendText, setSurface, startSession]);

  useEffect(() => {
    if (settingsPanelVisible) refreshSettings();
  }, [refreshSettings, settingsPanelVisible]);

  const appendInspectToComposer = useCallback(
    (text: string) => {
      setDraft((previous) => appendInspectToDraft(previous, text));
      textareaRef.current?.focus();
    },
    [setDraft]
  );

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
    (path: string) => {
      if (!canSelectWorkspace(path, workspacePath)) return;

      showSwitchedWorkspace(() => switchWorkspace(path, { preserveDraft: true }));
    },
    [workspacePath, switchWorkspace, showSwitchedWorkspace]
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
    window.pi.chat.abort().catch(() => {});
  }, []);

  const submitDraft = useCallback(() => {
    if (!draft.trim() || composerExiting) return;

    const pendingAttachments = attachments;

    if (surface === 'composer') {
      finishComposerExit(() => {
        setAttachments([]);
        window.pi.app.submitComposer(draft, pendingAttachments).catch(() => {});
        setDraft('');
      });
      return;
    }

    setAttachments([]);
    const mention = newSessionMention(draft);
    if (mention) {
      setDraft('');
      if (mention.prompt) void startSession(mention.prompt, pendingAttachments);
      return;
    }
    void send(pendingAttachments);
  }, [attachments, composerExiting, draft, finishComposerExit, send, setDraft, startSession, surface]);

  const discardComposerOverlay = useCallback(() => {
    if (surface !== 'composer' || composerExiting) return;
    finishComposerExit(() => {
      window.pi.app.hideComposer().catch(() => {});
    });
  }, [composerExiting, finishComposerExit, surface]);

  useEffect(() => {
    return window.pi.app.onHideComposerRequest(discardComposerOverlay);
  }, [discardComposerOverlay]);

  const openAttachment = useCallback((path: string) => {
    window.pi.app.openPath(path).catch(() => {});
  }, []);

  const chooseWorkspaceFromDock = useCallback(
    () => showSwitchedWorkspace(chooseWorkspaceDirectory),
    [chooseWorkspaceDirectory, showSwitchedWorkspace]
  );

  const selectWorkspaceFromDock = useCallback(
    (path: string) => {
      if (!canSelectWorkspace(path, workspacePath)) return;

      showSwitchedWorkspace(() => switchWorkspace(path));
    },
    [workspacePath, switchWorkspace, showSwitchedWorkspace]
  );

  const sessionRoutePending = surface === 'main' && route.name === 'session' && loadedSessionId !== route.sessionId;
  const hasTurns = turnCount > 0 || sessionRoutePending;
  const noProvidersConfigured = modelsLoaded && models.length === 0;

  const sidePanelLabel = sidePanelModeLabel(sidePanelMode);
  const sidePanelMaxRatio = sidePanelModeMaxRatio(sidePanelMode);
  const sidePanelResizable = sidePanelModeResizable(sidePanelMode);

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
      overlay={overlay}
      hasTurns={hasTurns}
      onStop={stopResponse}
      onSubmit={submitDraft}
      onDraftChange={setDraft}
      attachments={attachments}
      textareaRef={textareaRef}
      modelsLoaded={modelsLoaded}
      isGenerating={isGenerating}
      thinkingLevel={thinkingLevel}
      workspacePath={workspacePath}
      onOpenSettings={showSettings}
      onPaste={fileHandlers.onPaste}
      queuedMessages={queuedMessages}
      recallMessages={recallMessages}
      onCancel={discardComposerOverlay}
      onOpenAttachment={openAttachment}
      selectedModelKey={selectedModelKey}
      exiting={overlay && composerExiting}
      onRemoveAttachment={removeAttachment}
      onExitComplete={completeComposerExit}
      onSelectModel={selectModelFromComposer}
      onSteerQueuedMessage={steerQueuedMessage}
      revealKey={overlay ? composerRevealKey : 0}
      onEditQueuedMessage={editQueuedMessage}
      onDeleteQueuedMessage={deleteQueuedMessage}
      onReorderQueuedMessages={reorderQueuedMessages}
      noProvidersConfigured={noProvidersConfigured}
      onSelectWorkspace={selectWorkspaceFromComposer}
      onSelectThinkingLevel={selectThinkingFromComposer}
      onChooseWorkspaceDirectory={chooseWorkspaceFromComposer}
    />
  );

  return (
    <AppShell
      surface={surface}
      isGenerating={isGenerating}
      fileHandlers={fileHandlers}
      workspacePath={workspacePath}
      workspaceCollapsed={hasTurns}
      sidePanelLabel={sidePanelLabel}
      onOpenSettings={toggleSettings}
      gitPanelVisible={gitPanelVisible}
      onOpenSession={openRecentSession}
      activeSessionId={activeSessionId}
      sidePanelVisible={sidePanelVisible}
      onSidePanelCollapse={closeSidePanel}
      sessionViewActive={sessionViewActive}
      sidePanelResizable={sidePanelResizable}
      onToggleGitPanel={toggleGitChangesPanel}
      sessionRoutePending={sessionRoutePending}
      onDiscardComposer={discardComposerOverlay}
      onChooseDirectory={chooseWorkspaceFromDock}
      onSelectWorkspace={selectWorkspaceFromDock}
      settingsPanelVisible={settingsPanelVisible}
      overlayComposer={renderComposer(true, false)}
      mainComposer={renderComposer(false, hasTurns)}
      {...(sidePanelMaxRatio ? { sidePanelMaxRatio } : {})}
      sidePanel={
        <AppSidePanel
          mode={sidePanelMode}
          onClose={closeSidePanel}
          providers={authProviders}
          mobileRelay={mobileRelay}
          onSaveApiKey={saveApiKey}
          settingsTab={settingsTab}
          workspacePath={workspacePath}
          onSettingsTabChange={setSettingsTab}
          onBrowserUrlOpened={browserPanel.clear}
          onLoginSubscription={loginSubscription}
          onMobileRelayChange={updateMobileRelay}
          onDisconnectProvider={disconnectProvider}
          browserNavigation={browserPanel.navigation}
          solidWindowBackground={solidWindowBackground}
          onBrowserInspectText={appendInspectToComposer}
          onSolidWindowBackgroundChange={updateSolidWindowBackground}
        />
      }
    />
  );
};
