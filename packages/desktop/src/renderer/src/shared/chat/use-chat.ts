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
import { useChatEvents } from '@renderer/shared/chat/events';
import { clearFinderItemsCache } from '@renderer/shared/use-finder-items';
import { forgetWorkspace, rememberWorkspace } from '@renderer/shared/workspace/cache';
import { primeWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { selectedModelKeyState } from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

type UseChatOptions = {
  onShowChat: () => void;
  onShowSettings: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
};

type ClearSessionOptions = {
  preserveDraft?: boolean;
};

type WorkspaceSwitchOptions = ClearSessionOptions;

export const useChat = ({ onShowChat, onShowSettings, textareaRef }: UseChatOptions) => {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [workspacePath, setWorkspacePath] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<EffortLevel>('medium');
  const [authProviders, setAuthProviders] = useState<ProviderAuthStatus[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [loadedSessionId, setLoadedSessionId] = useState('');
  const [selectedModelKey, setSelectedModelKey] = useState('');
  const terminalIdRef = useRef<string | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const previousUserTurn = useMemo(() => {
    for (let index = turns.length - 1; index >= 0; index--) {
      const turn = turns[index];
      if (turn?.role === 'user') return turn.text;
    }

    return '';
  }, [turns]);
  const updateActiveSessionId = useCallback((sessionId: string | undefined) => {
    setActiveSessionId(sessionId ?? '');
  }, []);

  const loadAuthProviders = useCallback(async () => {
    setAuthProviders(await window.pi.chat.authProviders());
  }, []);

  const loadModels = useCallback(async () => {
    const modelList = await window.pi.chat.models();
    setModels(modelList.models);
    setModelsLoaded(true);
    selectedModelKeyState.value = modelList.selectedModelKey ?? '';
    setSelectedModelKey(modelList.selectedModelKey ?? '');
  }, []);

  const syncStatus = useCallback(async () => {
    const nextStatus = await window.pi.chat.status();
    setWorkspacePath(nextStatus.workspacePath);
    selectedModelKeyState.value = nextStatus.selectedModelKey ?? '';
    setSelectedModelKey(nextStatus.selectedModelKey ?? '');
    updateActiveSessionId(nextStatus.sessionId);
    if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
  }, [updateActiveSessionId]);

  const clearSession = useCallback(
    ({ preserveDraft = false }: ClearSessionOptions = {}) => {
      assistantIdRef.current = null;
      terminalIdRef.current = null;
      if (!preserveDraft) setDraft('');
      setTurns([]);
      setIsGenerating(false);
      setLoadedSessionId('');
      updateActiveSessionId('');
    },
    [updateActiveSessionId]
  );

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
        if (result.sessionId) {
          setLoadedSessionId(result.sessionId);
          updateActiveSessionId(result.sessionId);
        }
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
      if (result.sessionId) {
        setLoadedSessionId(result.sessionId);
        updateActiveSessionId(result.sessionId);
      }
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
    [isGenerating, updateActiveSessionId]
  );

  const send = useCallback(
    async (attachments: ImageAttachment[] = []) => {
      await sendText(draft, attachments);
    },
    [draft, sendText]
  );

  const applyOpenSession = useCallback(
    async (result: OpenSessionResult) => {
      if (!result.ok) return false;

      assistantIdRef.current = null;
      terminalIdRef.current = null;
      setDraft('');
      setIsGenerating(false);
      setTurns(result.turns ?? []);
      const nextStatus = await window.pi.chat.status();
      setWorkspacePath(nextStatus.workspacePath);
      selectedModelKeyState.value = nextStatus.selectedModelKey ?? '';
      setSelectedModelKey(nextStatus.selectedModelKey ?? '');
      if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
      setLoadedSessionId(result.id ?? '');
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
    (result: SwitchWorkspaceResult, options: WorkspaceSwitchOptions = {}) => {
      if (result.cancelled) return false;
      if (!result.ok || !result.status) return false;

      if (result.workspace) {
        rememberWorkspace(result.workspace);
      } else {
        forgetWorkspace(result.status.workspacePath);
      }
      clearFinderItemsCache();
      clearSession(options);
      setWorkspacePath(result.status.workspacePath);
      selectedModelKeyState.value = result.status.selectedModelKey ?? '';
      setSelectedModelKey(result.status.selectedModelKey ?? '');
      if (result.status.thinkingLevel) setThinkingLevel(result.status.thinkingLevel);
      primeWorkspaceFolders(result.status.workspacePath);
      textareaRef.current?.focus();
      return true;
    },
    [clearSession, textareaRef]
  );

  const switchWorkspace = useCallback(
    async (path: string, options?: WorkspaceSwitchOptions) =>
      applyWorkspaceSwitch(await window.pi.chat.switchWorkspace(path), options),
    [applyWorkspaceSwitch]
  );

  const chooseWorkspaceDirectory = useCallback(
    async (options?: WorkspaceSwitchOptions) =>
      applyWorkspaceSwitch(await window.pi.chat.chooseWorkspaceDirectory(), options),
    [applyWorkspaceSwitch]
  );

  const loginSubscription = useCallback(
    async (provider: string) => {
      const result = await window.pi.chat.loginSubscription(provider);
      setAuthProviders(result.providers);
      await loadModels();
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
      const previousModelKey = selectedModelKey;

      selectedModelKeyState.value = modelKey;
      setSelectedModelKey(modelKey);

      void window.pi.chat.selectModel(modelKey).then((nextStatus) => {
        if (nextStatus.ready) {
          selectedModelKeyState.value = nextStatus.selectedModelKey ?? modelKey;
          setSelectedModelKey(nextStatus.selectedModelKey ?? modelKey);
          if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
          return;
        }

        selectedModelKeyState.value = previousModelKey;
        setSelectedModelKey(previousModelKey);
      });
    },
    [selectedModelKey]
  );

  const selectThinkingLevel = useCallback(async (level: EffortLevel) => {
    const nextStatus = await window.pi.chat.selectThinkingLevel(level);
    if (nextStatus.ready && nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
  }, []);

  const refreshSettings = useCallback(() => {
    void loadModels();
    void loadAuthProviders();
  }, [loadAuthProviders, loadModels]);

  return {
    send,
    draft,
    turns,
    models,
    sendText,
    setDraft,
    saveApiKey,
    selectModel,
    openSession,
    modelsLoaded,
    isGenerating,
    workspacePath,
    thinkingLevel,
    authProviders,
    openSessionId,
    activeSessionId,
    loadedSessionId,
    switchWorkspace,
    refreshSettings,
    selectedModelKey,
    previousUserTurn,
    loginSubscription,
    selectThinkingLevel,
    chooseWorkspaceDirectory
  };
};
