import type {
  ChatStatus,
  EffortLevel,
  ModelOption,
  OpenSessionResult,
  ProviderAuthStatus,
  SwitchWorkspaceResult
} from '@preload/index';
import { useChatEvents } from '@renderer/shared/chat/events';
import { useChatSend } from '@renderer/shared/chat/send';
import { useTurnSummary } from '@renderer/shared/chat/turn-summary';
import { scrollSessionToBottom } from '@renderer/shared/turn/scroll';
import { clearFinderItemsCache } from '@renderer/shared/use-finder-items';
import { forgetWorkspace, rememberWorkspace } from '@renderer/shared/workspace/cache';
import { primeWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { selectedModelKeyState } from '@renderer/state/chat';
import type { RefObject } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';

interface UseChatOptions {
  onShowChat: () => void;
  onShowSettings: () => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

interface ClearSessionOptions {
  preserveDraft?: boolean;
}

interface WorkspaceSwitchOptions extends ClearSessionOptions {}

export const useChat = ({ onShowChat, onShowSettings, textareaRef }: UseChatOptions) => {
  const [draft, setDraft] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [workspacePath, setWorkspacePath] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<EffortLevel>('medium');
  const [authProviders, setAuthProviders] = useState<ProviderAuthStatus[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [loadedSessionId, setLoadedSessionId] = useState('');
  const [selectedModelKey, setSelectedModelKey] = useState('');
  const statusRequestRef = useRef(0);
  const sessionRequestRef = useRef(0);
  const terminalIdRef = useRef<string | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const newSessionRequestRef = useRef(0);
  const { setTurns, turnCount, previousUserTurn } = useTurnSummary();

  const updateActiveSessionId = useCallback((sessionId: string | undefined) => {
    setActiveSessionId(sessionId ?? '');
  }, []);

  const loadAuthProviders = useCallback(async () => {
    try {
      setAuthProviders(await window.pi.chat.authProviders());
    } catch {}
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const modelList = await window.pi.chat.models();
      setModels(modelList.models);
      setModelsLoaded(true);
      selectedModelKeyState.value = modelList.selectedModelKey ?? '';
      setSelectedModelKey(modelList.selectedModelKey ?? '');
    } catch {
      setModelsLoaded(true);
    }
  }, []);

  const applyStatus = useCallback(
    (nextStatus: ChatStatus) => {
      primeWorkspaceFolders(nextStatus.workspacePath);
      setWorkspacePath(nextStatus.workspacePath);
      selectedModelKeyState.value = nextStatus.selectedModelKey ?? '';
      setSelectedModelKey(nextStatus.selectedModelKey ?? '');
      updateActiveSessionId(nextStatus.sessionId);
      if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
    },
    [updateActiveSessionId]
  );

  const syncStatus = useCallback(async () => {
    const requestId = statusRequestRef.current + 1;
    statusRequestRef.current = requestId;
    const nextStatus = await window.pi.chat.status();
    if (statusRequestRef.current !== requestId) return;
    if (newSessionRequestRef.current > 0 && nextStatus.sessionId) return;
    applyStatus(nextStatus);
  }, [applyStatus]);

  const clearSession = useCallback(
    ({ preserveDraft = false }: ClearSessionOptions = {}) => {
      sessionRequestRef.current += 1;
      statusRequestRef.current += 1;
      assistantIdRef.current = null;
      terminalIdRef.current = null;
      if (!preserveDraft) setDraft('');
      setTurns(() => []);
      setIsGenerating(false);
      setLoadedSessionId('');
      updateActiveSessionId('');
    },
    [setTurns, updateActiveSessionId]
  );

  const newSession = useCallback(async () => {
    const requestId = newSessionRequestRef.current + 1;
    newSessionRequestRef.current = requestId;
    clearSession();
    try {
      await window.pi.chat.newSession();
    } catch {
    } finally {
      if (newSessionRequestRef.current === requestId) newSessionRequestRef.current = 0;
    }
  }, [clearSession]);

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

  const { send, sendText } = useChatSend({
    draft,
    setDraft,
    setTurns,
    isGenerating,
    terminalIdRef,
    assistantIdRef,
    setIsGenerating,
    sessionRequestRef,
    setLoadedSessionId,
    updateActiveSessionId
  });

  const applyOpenSession = useCallback(
    async (result: OpenSessionResult, requestId: number) => {
      if (!result.ok) return false;

      let nextStatus: ChatStatus;
      try {
        nextStatus = await window.pi.chat.status();
      } catch {
        return false;
      }
      if (sessionRequestRef.current !== requestId) return false;
      applyStatus(nextStatus);
      assistantIdRef.current = null;
      terminalIdRef.current = null;
      setDraft('');
      setIsGenerating(false);
      setTurns(() => result.turns ?? []);
      scrollSessionToBottom();
      setLoadedSessionId(result.id ?? '');
      updateActiveSessionId(result.id);
      textareaRef.current?.focus();
      return true;
    },
    [applyStatus, setTurns, textareaRef, updateActiveSessionId]
  );

  const openSession = useCallback(
    async (path: string) => {
      const requestId = sessionRequestRef.current + 1;
      sessionRequestRef.current = requestId;
      try {
        return await applyOpenSession(await window.pi.chat.openSession(path), requestId);
      } catch {
        return false;
      }
    },
    [applyOpenSession]
  );

  const openSessionId = useCallback(
    async (sessionId: string) => {
      const requestId = sessionRequestRef.current + 1;
      sessionRequestRef.current = requestId;
      try {
        return await applyOpenSession(await window.pi.chat.openSessionId(sessionId), requestId);
      } catch {
        return false;
      }
    },
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
    async (path: string, options?: WorkspaceSwitchOptions) => {
      try {
        return applyWorkspaceSwitch(await window.pi.chat.switchWorkspace(path), options);
      } catch {
        return false;
      }
    },
    [applyWorkspaceSwitch]
  );

  const chooseWorkspaceDirectory = useCallback(
    async (options?: WorkspaceSwitchOptions) => {
      try {
        return applyWorkspaceSwitch(await window.pi.chat.chooseWorkspaceDirectory(), options);
      } catch {
        return false;
      }
    },
    [applyWorkspaceSwitch]
  );

  const loginSubscription = useCallback(
    async (provider: string) => {
      try {
        const result = await window.pi.chat.loginSubscription(provider);
        setAuthProviders(result.providers);
        await loadModels();
      } catch {}
    },
    [loadModels]
  );

  const saveApiKey = useCallback(
    async (provider: string, apiKey: string) => {
      try {
        setAuthProviders(await window.pi.chat.setRuntimeApiKey(provider, apiKey));
        await loadModels();
      } catch {}
    },
    [loadModels]
  );

  const selectModel = useCallback(
    (modelKey: string) => {
      const previousModelKey = selectedModelKey;

      selectedModelKeyState.value = modelKey;
      setSelectedModelKey(modelKey);

      void window.pi.chat
        .selectModel(modelKey)
        .then((nextStatus) => {
          if (nextStatus.ready) {
            selectedModelKeyState.value = nextStatus.selectedModelKey ?? modelKey;
            setSelectedModelKey(nextStatus.selectedModelKey ?? modelKey);
            if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
            return;
          }

          selectedModelKeyState.value = previousModelKey;
          setSelectedModelKey(previousModelKey);
        })
        .catch(() => {
          selectedModelKeyState.value = previousModelKey;
          setSelectedModelKey(previousModelKey);
        });
    },
    [selectedModelKey]
  );

  const selectThinkingLevel = useCallback(async (level: EffortLevel) => {
    try {
      const nextStatus = await window.pi.chat.selectThinkingLevel(level);
      if (nextStatus.ready && nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
    } catch {}
  }, []);

  const refreshSettings = useCallback(() => {
    void loadModels().catch(() => {});
    void loadAuthProviders().catch(() => {});
  }, [loadAuthProviders, loadModels]);

  return {
    send,
    draft,
    models,
    turnCount,
    sendText,
    setDraft,
    newSession,
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
