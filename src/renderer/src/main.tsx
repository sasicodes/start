import type { EffortLevel } from '@preload/index';
import { Composer, Messages, Settings } from '@renderer/shared/chat';
import { RecentSessions } from '@renderer/shared/sessions';
import { SettingsButton } from '@renderer/shared/settings-button';
import { useChat } from '@renderer/shared/use-chat';
import { Workspace } from '@renderer/shared/workspace';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { render } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import './styles.css';

type AppSurface = 'main' | 'composer';
type AppView = 'chat' | 'settings';

const initialSurface = (): AppSurface =>
  new URLSearchParams(window.location.search).get('surface') === 'composer' ? 'composer' : 'main';

const App = () => {
  const [view, setView] = useState<AppView>('chat');
  const [surface, setSurface] = useState<AppSurface>(initialSurface);
  const [composerShortcut, setComposerShortcut] = useState('Control+Space');
  const textareaRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const showChat = useCallback(() => {
    setView('chat');
    setSurface('main');
    textareaRef.current?.focus();
  }, []);

  const showSettings = useCallback(() => {
    if (surface === 'composer') {
      void window.pi.app.openSettings();
      return;
    }

    setView('settings');
    setSurface('main');
  }, [surface]);

  const {
    draft,
    models,
    send,
    status,
    messages,
    sendText,
    setDraft,
    saveApiKey,
    isGenerating,
    selectModel,
    openSession,
    refreshSettings,
    thinkingLevel,
    authProviders,
    selectedModelKey,
    activeSessionId,
    previousUserMessage,
    loginSubscription,
    selectThinkingLevel
  } = useChat({ onShowChat: showChat, onShowSettings: showSettings, textareaRef });

  useEffect(() => {
    void window.pi.app.settings().then((settings) => setComposerShortcut(settings.composerShortcut));
  }, []);

  useEffect(() => {
    if (view !== 'chat') return;

    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [surface, view]);

  useEffect(() => {
    return window.pi.app.onShowComposer(() => {
      setView('chat');
      setSurface('composer');
      textareaRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    return window.pi.app.onSubmitComposer((prompt) => {
      setView('chat');
      setSurface('main');
      void sendText(prompt);
    });
  }, [sendText]);

  useEffect(() => {
    if (view === 'settings') refreshSettings();
  }, [refreshSettings, view]);

  const updateComposerShortcut = useCallback(async (shortcut: string) => {
    const result = await window.pi.app.setComposerShortcut(shortcut);
    if (result.settings) setComposerShortcut(result.settings.composerShortcut);
    return result;
  }, []);

  const newSession = useCallback(() => {
    void window.pi.chat.newSession();
  }, []);

  const refillPrevious = useCallback(() => {
    setDraft(previousUserMessage);
    textareaRef.current?.focus();
  }, [previousUserMessage, setDraft]);

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

  const startNewSession = useCallback(() => {
    newSession();
  }, [newSession]);

  const stopResponse = useCallback(() => {
    void window.pi.chat.abort();
  }, []);

  const submitDraft = useCallback(() => {
    if (surface === 'composer') {
      void window.pi.app.submitComposer(draft);
      setDraft('');
      return;
    }

    void send();
  }, [draft, send, setDraft, surface]);

  const hideComposerOverlay = useCallback(() => {
    if (surface === 'composer') void window.pi.app.hideComposer();
  }, [surface]);

  useAppHotkey(appHotkeys.newChat, () => startNewSession());
  useAppHotkey(appHotkeys.settings, () => showSettings());

  return (
    <main
      aria-label="start"
      onMouseDown={hideComposerOverlay}
      class="relative block h-full min-h-screen w-full overflow-hidden bg-transparent"
    >
      {surface === 'main' && (
        <div aria-hidden="true" class="absolute inset-x-0 top-0 z-2 h-7 [-webkit-app-region:drag]" />
      )}
      {view === 'settings' ? (
        <Settings
          providers={authProviders}
          onClose={showChat}
          onSaveApiKey={saveApiKey}
          composerShortcut={composerShortcut}
          onComposerShortcutChange={updateComposerShortcut}
          onLoginSubscription={loginSubscription}
        />
      ) : (
        <>
          {surface === 'main' && <Messages status={status} messages={messages} />}
          {surface === 'main' && (
            <div class="absolute bottom-4.5 left-4.5 z-40 flex items-end gap-2 [-webkit-app-region:no-drag]">
              <Workspace />
              <RecentSessions onOpenSession={openSession} activeSessionId={activeSessionId} />
            </div>
          )}
          {surface === 'main' && <SettingsButton onOpenSettings={showSettings} />}
          <Composer
            draft={draft}
            models={models}
            onStop={stopResponse}
            onSubmit={submitDraft}
            onDraftChange={setDraft}
            textareaRef={textareaRef}
            isGenerating={isGenerating}
            thinkingLevel={thinkingLevel}
            overlay={surface === 'composer'}
            hasMessages={surface === 'main' && messages.length > 0}
            onRefillPrevious={refillPrevious}
            selectedModelKey={selectedModelKey}
            previousMessage={previousUserMessage}
            onSelectModel={selectModelFromComposer}
            onOpenSettings={showSettings}
            onSelectThinkingLevel={selectThinkingFromComposer}
          />
        </>
      )}
    </main>
  );
};

const root = document.getElementById('root');

if (!(root instanceof HTMLElement)) {
  throw new Error('start root element was not found');
}

render(<App />, root);
