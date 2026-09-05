import { usePendingAttachments } from '@renderer/app/attachments';
import { useBrowserPanel } from '@renderer/app/browser';
import { useComposerOverlay } from '@renderer/app/composer-overlay';
import { useAppNavigation } from '@renderer/app/navigation';
import { AppSidePanel } from '@renderer/app/panel';
import { useRendererRuntime } from '@renderer/app/runtime';
import { useSessionPanels } from '@renderer/app/session/panels';
import { useSessionRoute } from '@renderer/app/session/route';
import { AppShell } from '@renderer/app/shell';
import { useAppComposer } from '@renderer/app/use-composer';
import { useWorkspaceSwitch } from '@renderer/app/use-workspace-switch';
import { sidePanelModeLabel, sidePanelModeLayout } from '@renderer/app/utils/panel';
import { prewarmMarkdownRenderer } from '@renderer/markdown';
import { appendInspectToDraft } from '@renderer/shared/browser/inspect-draft';
import { Composer } from '@renderer/shared/chat/index';
import { useChat } from '@renderer/shared/chat/use-chat';
import { useFileAttachments } from '@renderer/shared/composer/use-file-attachments';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { useCallback, useEffect, useRef } from 'preact/hooks';

export const App = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { route, surface, setSurface, navigate, showChat } = useAppNavigation(textareaRef);
  const { composerExiting, composerRevealKey, finishComposerExit, completeComposerExit } = useComposerOverlay({
    setSurface,
    textareaRef
  });
  const { attachments, setAttachments, removeAttachment, clearPendingAttachments } = usePendingAttachments();
  const { solidWindowBackground, updateSolidWindowBackground } = useRendererRuntime();
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
    currentSessionId,
    switchWorkspace,
    refreshSettings,
    recallMessages,
    selectedModelKey,
    loginSubscription,
    disconnectProvider,
    steerQueuedMessage,
    sendQueuedMessage,
    deleteQueuedMessage,
    selectThinkingLevel,
    reorderQueuedMessages,
    chooseWorkspaceDirectory
  } = useChat({ onShowChat: showChatFromEvent, onShowSettings: showSettings, textareaRef });

  useEffect(() => {
    prewarmMarkdownRenderer();
  }, []);

  const { submitDraft, discardComposerOverlay } = useAppComposer({
    send,
    draft,
    setDraft,
    sendText,
    navigate,
    surface,
    setSurface,
    startSession,
    attachments,
    activeSessionId,
    setAttachments,
    composerExiting,
    finishComposerExit,
    clearPendingAttachments
  });

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

  const {
    switchingWorkspace,
    chooseWorkspaceFromDock,
    selectWorkspaceFromDock,
    chooseWorkspaceFromComposer,
    selectWorkspaceFromComposer
  } = useWorkspaceSwitch({
    surface,
    navigate,
    workspacePath,
    closeSidePanel,
    switchWorkspace,
    chooseWorkspaceDirectory
  });

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

  const openAttachment = useCallback((path: string) => {
    window.pi.app.openPath(path).catch(() => {});
  }, []);

  const sessionRoutePending = surface === 'main' && route.name === 'session' && loadedSessionId !== route.sessionId;
  const hasTurns = turnCount > 0 || sessionRoutePending;
  const noProvidersConfigured = modelsLoaded && models.length === 0;

  const sidePanelLabel = sidePanelModeLabel(sidePanelMode);
  const sidePanelLayout = sidePanelModeLayout(sidePanelMode);

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
      onSelectModel={selectModel}
      onSteerQueuedMessage={steerQueuedMessage}
      onSendQueuedMessage={sendQueuedMessage}
      revealKey={overlay ? composerRevealKey : 0}
      onDeleteQueuedMessage={deleteQueuedMessage}
      onReorderQueuedMessages={reorderQueuedMessages}
      noProvidersConfigured={noProvidersConfigured}
      onSelectWorkspace={selectWorkspaceFromComposer}
      onSelectThinkingLevel={selectThinkingLevel}
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
      sidePanelLayout={sidePanelLayout}
      gitPanelVisible={gitPanelVisible}
      onOpenSession={openRecentSession}
      activeSessionId={currentSessionId}
      sidePanelVisible={sidePanelVisible}
      onSidePanelCollapse={closeSidePanel}
      sessionViewActive={sessionViewActive}
      onToggleGitPanel={toggleGitChangesPanel}
      sessionRoutePending={sessionRoutePending}
      onDiscardComposer={discardComposerOverlay}
      onChooseDirectory={chooseWorkspaceFromDock}
      onSelectWorkspace={selectWorkspaceFromDock}
      settingsPanelVisible={settingsPanelVisible}
      overlayComposer={renderComposer(true, false)}
      mainComposer={renderComposer(false, hasTurns)}
      sidePanel={
        <AppSidePanel
          mode={sidePanelMode}
          onClose={closeSidePanel}
          providers={authProviders}
          onSaveApiKey={saveApiKey}
          settingsTab={settingsTab}
          workspacePath={workspacePath}
          onSettingsTabChange={setSettingsTab}
          onBrowserUrlOpened={browserPanel.clear}
          onLoginSubscription={loginSubscription}
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
