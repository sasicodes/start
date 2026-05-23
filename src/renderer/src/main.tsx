import type { EffortLevel, ImageAttachment, RecentSession } from '@preload/index';
import { Composer, Turns, Settings } from '@renderer/shared/chat/index';
import { DebugToolbar } from '@renderer/shared/debug';
import { DropOverlay } from '@renderer/shared/drop-overlay';
import { SettingsButton } from '@renderer/shared/settings/button';
import { useChat } from '@renderer/shared/chat/use-chat';
import { useFileAttachments } from '@renderer/shared/composer/use-file-attachments';
import { SidePanelLayout } from '@renderer/shared/side-panel/layout';
import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { ActivityPanel } from '@renderer/shared/turn/panel';
import { WorkspaceDock } from '@renderer/shared/workspace/dock';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { currentRoute, routeUrl, sameRoute, type AppRoute } from '@renderer/utils/route';
import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import './styles.css';

type AppSurface = 'main' | 'composer';

const installRendererIcon = () => {
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon) icon.href = import.meta.env.DEV ? '/icon-dev.png' : '/icon.png';
};

const initialSurface = (): AppSurface =>
  new URLSearchParams(window.location.search).get('surface') === 'composer' ? 'composer' : 'main';

const routeForSession = (sessionId: string | undefined): AppRoute =>
  sessionId ? { name: 'session', sessionId } : { name: 'chat' };

installRendererIcon();

const App = () => {
  const [route, setRoute] = useState<AppRoute>(currentRoute);
  const [surface, setSurface] = useState<AppSurface>(initialSurface);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [activityTurnId, setActivityTurnId] = useState<string | undefined>();
  const [debugToolbarVisible, setDebugToolbarVisible] = useState(false);
  const [composerShortcut, setComposerShortcut] = useState('Control+Space');
  const openingRouteSessionRef = useRef<string | undefined>();
  const selectingSessionRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const releasePendingAttachments = useCallback((items: ImageAttachment[]) => {
    if (items.length > 0) void window.pi.chat.releaseAttachments(items.map((attachment) => attachment.id));
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setAttachments((current) => {
      releasePendingAttachments(current);
      return [];
    });
  }, [releasePendingAttachments]);

  const navigate = useCallback(
    (nextRoute: AppRoute, replace = false) => {
      if (surface === 'composer') return;
      const nextUrl = routeUrl(nextRoute);
      if (replace) {
        window.history.replaceState(nextRoute, '', nextUrl);
      } else {
        window.history.pushState(nextRoute, '', nextUrl);
      }
      setRoute(nextRoute);
    },
    [surface]
  );

  const showChat = useCallback(() => {
    setSurface('main');
    navigate({ name: 'chat' });
    textareaRef.current?.focus();
  }, [navigate]);

  const showSettings = useCallback(() => {
    if (surface === 'composer') {
      void window.pi.app.openSettings();
      return;
    }

    setSurface('main');
    navigate({ name: 'settings' });
  }, [navigate, surface]);

  const {
    send,
    draft,
    models,
    status,
    sendText,
    setDraft,
    turns,
    modelsLoaded,
    saveApiKey,
    selectModel,
    openSession,
    openSessionId,
    isGenerating,
    workspacePath,
    thinkingLevel,
    authProviders,
    switchWorkspace,
    refreshSettings,
    selectedModelKey,
    activeSessionId,
    loginSubscription,
    previousUserTurn,
    chooseWorkspaceDirectory,
    selectThinkingLevel
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
    void window.pi.app.settings().then((settings) => setComposerShortcut(settings.composerShortcut));
    void window.pi.app.runtime().then((runtime) => setDebugToolbarVisible(runtime.debugToolbar));
  }, []);

  useEffect(() => {
    if (route.name === 'settings') return;

    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [route.name, surface]);

  useEffect(() => {
    return window.pi.app.onShowComposer(() => {
      setSurface('composer');
      textareaRef.current?.focus();
    });
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
    if (route.name === 'settings') refreshSettings();
  }, [refreshSettings, route.name]);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    if (surface === 'composer') return;
    if (route.name !== 'chat' || !activeSessionId) return;
    navigate({ name: 'session', sessionId: activeSessionId }, true);
  }, [activeSessionId, navigate, route.name, surface]);

  useEffect(() => {
    if (surface === 'composer') return;
    if (route.name !== 'session') return;
    if (selectingSessionRef.current) return;
    if (route.sessionId === activeSessionId) return;
    if (openingRouteSessionRef.current === route.sessionId) return;

    openingRouteSessionRef.current = route.sessionId;
    void openSessionId(route.sessionId).then((opened) => {
      openingRouteSessionRef.current = undefined;
      if (!opened && sameRoute(currentRoute(), route)) navigate({ name: 'chat' }, true);
    });
  }, [activeSessionId, navigate, openSessionId, route, surface]);

  const updateComposerShortcut = useCallback(async (shortcut: string) => {
    const result = await window.pi.app.setComposerShortcut(shortcut);
    if (result.settings) setComposerShortcut(result.settings.composerShortcut);
    return result;
  }, []);

  const newSession = useCallback(() => {
    void window.pi.chat.newSession();
  }, []);

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
    await chooseWorkspaceDirectory({ preserveDraft: surface === 'composer' });
  }, [chooseWorkspaceDirectory, surface]);

  const selectWorkspaceFromComposer = useCallback(
    (path: string) => {
      void switchWorkspace(path, { preserveDraft: true });
    },
    [switchWorkspace]
  );

  const startNewSession = useCallback(() => {
    clearPendingAttachments();
    navigate({ name: 'chat' });
    newSession();
  }, [clearPendingAttachments, navigate, newSession]);

  const openRecentSession = useCallback(
    async (session: RecentSession) => {
      selectingSessionRef.current = true;
      try {
        const opened = await openSession(session.path);
        if (opened) navigate({ name: 'session', sessionId: session.id }, true);
        return opened;
      } finally {
        selectingSessionRef.current = false;
      }
    },
    [navigate, openSession]
  );

  const stopResponse = useCallback(() => {
    void window.pi.chat.abort();
  }, []);

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((current) => {
        const removed = current.find((attachment) => attachment.id === id);
        if (removed) releasePendingAttachments([removed]);
        return current.filter((attachment) => attachment.id !== id);
      });
    },
    [releasePendingAttachments]
  );

  const submitDraft = useCallback(() => {
    if (!draft.trim()) return;

    const pendingAttachments = attachments;
    setAttachments([]);

    if (surface === 'composer') {
      void window.pi.app.submitComposer(draft, pendingAttachments);
      setDraft('');
      return;
    }

    void send(pendingAttachments);
  }, [attachments, draft, send, setDraft, surface]);

  const discardComposerOverlay = useCallback(() => {
    if (surface !== 'composer') return;
    discardComposerDraft();
    void window.pi.app.hideComposer();
  }, [discardComposerDraft, surface]);

  const openAttachment = useCallback((path: string) => {
    void window.pi.app.openPath(path);
  }, []);

  const collapseActivityPanel = useCallback(() => setActivityTurnId(undefined), []);
  const sessionViewActive = route.name === 'chat' || route.name === 'session';
  const activityTurn = useMemo(() => turns.find((turn) => turn.id === activityTurnId), [activityTurnId, turns]);
  const activityDetails = activityTurn?.details ?? [];
  const activityThinking = activityTurn?.thinking ?? '';
  const activityPanelVisible =
    surface === 'main' &&
    sessionViewActive &&
    Boolean(activityTurn && hasActivityDetails(activityDetails, activityThinking));

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
      workspacePath={workspacePath}
      overlay={overlay}
      hasTurns={hasTurns}
      onRefillPrevious={refillPrevious}
      selectedModelKey={selectedModelKey}
      previousTurn={previousUserTurn}
      onOpenAttachment={openAttachment}
      onRemoveAttachment={removeAttachment}
      onSelectModel={selectModelFromComposer}
      onOpenSettings={showSettings}
      onSelectWorkspace={selectWorkspaceFromComposer}
      onChooseWorkspaceDirectory={chooseWorkspaceFromComposer}
      onSelectThinkingLevel={selectThinkingFromComposer}
    />
  );

  return (
    <main
      aria-label="start"
      onDrop={sessionViewActive ? fileHandlers.onDrop : undefined}
      onDragOver={sessionViewActive ? fileHandlers.onDragOver : undefined}
      onMouseDown={surface === 'composer' ? discardComposerOverlay : undefined}
      onDragEnter={sessionViewActive ? fileHandlers.onDragEnter : undefined}
      onDragLeave={sessionViewActive ? fileHandlers.onDragLeave : undefined}
      class="relative block h-full min-h-screen w-full overflow-hidden bg-transparent"
    >
      {surface === 'main' && (
        <div aria-hidden="true" class="absolute inset-x-0 top-0 z-[1000] h-7 [-webkit-app-region:drag]" />
      )}
      {route.name === 'settings' ? (
        <Settings
          providers={authProviders}
          onClose={closeSettings}
          onSaveApiKey={saveApiKey}
          composerShortcut={composerShortcut}
          onComposerShortcutChange={updateComposerShortcut}
          onLoginSubscription={loginSubscription}
        />
      ) : surface === 'main' ? (
        <SidePanelLayout
          sidePanelLabel="Agent activity"
          sidePanelVisible={activityPanelVisible}
          onSidePanelCollapse={collapseActivityPanel}
          sidePanel={<ActivityPanel details={activityDetails} thinking={activityThinking} />}
        >
          <Turns
            status={status}
            turns={turns}
            activityPanelTurnId={activityPanelVisible ? activityTurnId : undefined}
            onOpenActivityPanel={setActivityTurnId}
          />
          <WorkspaceDock
            workspacePath={workspacePath}
            onOpenSession={openRecentSession}
            activeSessionId={activeSessionId}
            onChooseDirectory={() => void chooseWorkspaceDirectory()}
            onSelectWorkspace={(path) => void switchWorkspace(path)}
          />
          <SettingsButton onOpenSettings={showSettings} />
          {renderComposer(false, turns.length > 0)}
        </SidePanelLayout>
      ) : (
        renderComposer(true, false)
      )}
      {sessionViewActive && <DropOverlay visible={fileHandlers.dropActive} />}
      {debugToolbarVisible && surface === 'main' && <DebugToolbar />}
    </main>
  );
};

const root = document.getElementById('root');

if (!(root instanceof HTMLElement)) {
  throw new Error('start root element was not found');
}

render(<App />, root);
