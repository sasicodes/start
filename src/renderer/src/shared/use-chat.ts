import type {
  EffortLevel,
  ImageAttachment,
  ModelOption,
  OpenSessionResult,
  ProviderAuthStatus,
  SwitchWorkspaceResult
} from '@preload/index';
import { createTurn } from '@renderer/functions/chat';
import { commandInput, commandMode } from '@renderer/shared/input';
import { useChatEvents } from '@renderer/shared/use-chat-events';
import { clearFinderItemsCache } from '@renderer/shared/use-finder-items';
import { loadWorkspaceFolders } from '@renderer/shared/workspace-folders';
import { selectedModelKeyState } from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

type UseChatOptions = {
  onShowChat: () => void;
  onShowSettings: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
};

export const useChat = ({ onShowChat, onShowSettings, textareaRef }: UseChatOptions) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Checking Pi auth...');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [workspacePath, setWorkspacePath] = useState<string | undefined>();
  const [authProviders, setAuthProviders] = useState<ProviderAuthStatus[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState<string | undefined>();
  const [thinkingLevel, setThinkingLevel] = useState<EffortLevel>('medium');
  const assistantIdRef = useRef<string | null>(null);
  const terminalIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | undefined>();
  const previousUserTurn = useMemo(() => {
    for (let index = turns.length - 1; index >= 0; index--) {
      const turn = turns[index];
      if (turn?.role === 'user') return turn.text;
    }

    return '';
  }, [turns]);
  const updateActiveSessionId = useCallback((sessionId: string | undefined) => {
    currentSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
  }, []);

  const loadAuthProviders = useCallback(async () => {
    setAuthProviders(await window.pi.chat.authProviders());
  }, []);

  const loadModels = useCallback(async () => {
    const modelList = await window.pi.chat.models();
    setModels(modelList.models);
    setModelsLoaded(true);
    selectedModelKeyState.value = modelList.selectedModelKey;
    setSelectedModelKey(modelList.selectedModelKey);
    if (modelList.error) setStatus(modelList.error);
  }, []);

  const syncStatus = useCallback(async () => {
    const nextStatus = await window.pi.chat.status();
    setStatus(nextStatus.ready ? `Using ${nextStatus.modelLabel}` : (nextStatus.error ?? 'Pi is not ready.'));
    setWorkspacePath(nextStatus.workspacePath);
    selectedModelKeyState.value = nextStatus.selectedModelKey;
    setSelectedModelKey(nextStatus.selectedModelKey);
    updateActiveSessionId(nextStatus.sessionId);
    if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
  }, [updateActiveSessionId]);

  const clearSession = useCallback(() => {
    assistantIdRef.current = null;
    terminalIdRef.current = null;
    setDraft('');
    setTurns([]);
    setIsGenerating(false);
    updateActiveSessionId(undefined);
  }, [updateActiveSessionId]);

  useChatEvents({
    onShowChat,
    setTurns,
    syncStatus,
    loadModels,
    textareaRef,
    clearSession,
    terminalIdRef,
    assistantIdRef,
    onShowSettings,
    setIsGenerating
  });

  const sendText = useCallback(
    async (value: string, attachments: ImageAttachment[] = []) => {
      const text = value.trim();
      if (!text || isGenerating) return;

      const command = commandInput(text);
      if (commandMode(text)) {
        if (!command) return;

        const terminalTurn = createTurn('terminal', '');
        const userTurn = createTurn('user', text);
        terminalIdRef.current = terminalTurn.id;
        setDraft('');
        setIsGenerating(true);
        setTurns((current) => [...current, userTurn, terminalTurn]);

        const result = await window.pi.chat.command(command.command, command.excludeFromContext);
        if (result.sessionId) updateActiveSessionId(result.sessionId);
        if (!result.ok) {
          const terminalId = terminalIdRef.current;
          terminalIdRef.current = null;
          setIsGenerating(false);
          setTurns((current) => [
            ...current.filter((turn) => turn.id !== terminalId),
            createTurn('system', result.error ?? 'Command failed.')
          ]);
        }
        return;
      }

      const assistantTurn = { ...createTurn('assistant', ''), streaming: true };
      const userTurn = createTurn('user', text);
      assistantIdRef.current = assistantTurn.id;
      setDraft('');
      setIsGenerating(true);
      setTurns((current) => [...current, userTurn, assistantTurn]);

      const result = await window.pi.chat.send(text, attachments);
      if (result.sessionId) updateActiveSessionId(result.sessionId);
      if (!result.ok) {
        const assistantId = assistantIdRef.current;
        if (!assistantId) return;

        assistantIdRef.current = null;
        setIsGenerating(false);
        setTurns((current) => [
          ...current.map((turn) => (turn.id === assistantId ? { ...turn, streaming: false } : turn)),
          createTurn('system', result.error ?? 'Pi failed.')
        ]);
      }
    },
    [isGenerating]
  );

  const send = useCallback(
    async (attachments: ImageAttachment[] = []) => {
      await sendText(draft, attachments);
    },
    [draft, sendText]
  );

  const applyOpenSession = useCallback(
    async (result: OpenSessionResult) => {
      if (!result.ok) {
        setStatus(result.error ?? 'Session could not be opened.');
        return false;
      }

      assistantIdRef.current = null;
      terminalIdRef.current = null;
      setDraft('');
      setIsGenerating(false);
      setTurns(result.turns ?? []);
      const nextStatus = await window.pi.chat.status();
      setWorkspacePath(nextStatus.workspacePath);
      selectedModelKeyState.value = nextStatus.selectedModelKey;
      setSelectedModelKey(nextStatus.selectedModelKey);
      if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
      setStatus(nextStatus.ready ? `Using ${nextStatus.modelLabel}` : (nextStatus.error ?? 'Pi is not ready.'));
      updateActiveSessionId(result.id);
      textareaRef.current?.focus();
      return true;
    },
    [textareaRef, updateActiveSessionId]
  );

  const openSession = useCallback(
    async (path: string) => applyOpenSession(await window.pi.chat.openSession(path)),
    [applyOpenSession]
  );

  const openSessionId = useCallback(
    async (sessionId: string) => applyOpenSession(await window.pi.chat.openSessionId(sessionId)),
    [applyOpenSession]
  );

  const applyWorkspaceSwitch = useCallback(
    (result: SwitchWorkspaceResult) => {
      if (result.cancelled) return false;
      if (!result.ok || !result.status) {
        setStatus(result.error ?? 'Workspace could not be switched.');
        return false;
      }

      clearFinderItemsCache();
      clearSession();
      setWorkspacePath(result.status.workspacePath);
      selectedModelKeyState.value = result.status.selectedModelKey;
      setSelectedModelKey(result.status.selectedModelKey);
      if (result.status.thinkingLevel) setThinkingLevel(result.status.thinkingLevel);
      setStatus(
        result.status.ready ? `Using ${result.status.modelLabel}` : (result.status.error ?? 'Pi is not ready.')
      );
      void loadWorkspaceFolders();
      textareaRef.current?.focus();
      return true;
    },
    [clearSession, textareaRef]
  );

  const switchWorkspace = useCallback(
    async (path: string) => applyWorkspaceSwitch(await window.pi.chat.switchWorkspace(path)),
    [applyWorkspaceSwitch]
  );

  const chooseWorkspaceDirectory = useCallback(async () => {
    return applyWorkspaceSwitch(await window.pi.chat.chooseWorkspaceDirectory());
  }, [applyWorkspaceSwitch]);

  const loginSubscription = useCallback(
    async (provider: string) => {
      const result = await window.pi.chat.loginSubscription(provider);
      setAuthProviders(result.providers);
      await loadModels();
      if (result.error) setStatus(result.error);
    },
    [loadModels]
  );

  const saveApiKey = useCallback(
    async (provider: string, apiKey: string) => {
      setAuthProviders(await window.pi.chat.setRuntimeApiKey(provider, apiKey));
      await loadModels();
    },
    [loadModels]
  );

  const selectModel = useCallback(
    (modelKey: string) => {
      const model = models.find((entry) => entry.key === modelKey);
      const previousModelKey = selectedModelKey;

      selectedModelKeyState.value = modelKey;
      setSelectedModelKey(modelKey);
      if (model) setStatus(`Using ${model.name}`);

      void window.pi.chat.selectModel(modelKey).then((nextStatus) => {
        if (nextStatus.ready) {
          selectedModelKeyState.value = nextStatus.selectedModelKey ?? modelKey;
          setSelectedModelKey(nextStatus.selectedModelKey ?? modelKey);
          if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
          setStatus(`Using ${nextStatus.modelLabel}`);
          return;
        }

        selectedModelKeyState.value = previousModelKey;
        setSelectedModelKey(previousModelKey);
        setStatus(nextStatus.error ?? 'Pi model could not be selected.');
      });
    },
    [models, selectedModelKey]
  );

  const selectThinkingLevel = useCallback(async (level: EffortLevel) => {
    const nextStatus = await window.pi.chat.selectThinkingLevel(level);
    if (nextStatus.ready) {
      if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
      setStatus(`Using ${nextStatus.modelLabel}`);
      return;
    }

    setStatus(nextStatus.error ?? 'Pi thinking level could not be selected.');
  }, []);

  const refreshSettings = useCallback(() => {
    void loadModels();
    void loadAuthProviders();
  }, [loadAuthProviders, loadModels]);

  return {
    send,
    draft,
    models,
    modelsLoaded,
    status,
    sendText,
    setDraft,
    turns,
    saveApiKey,
    openSession,
    openSessionId,
    isGenerating,
    workspacePath,
    selectModel,
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
  };
};
