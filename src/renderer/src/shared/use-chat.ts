import type { EffortLevel, ModelOption, ProviderAuthStatus } from '@preload/index';
import { createMessage } from '@renderer/functions/chat';
import { commandInput, commandMode } from '@renderer/shared/input';
import { selectedModelKeyState } from '@renderer/state/chat';
import type { ChatMessage } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

type UseChatOptions = {
  onShowChat: () => void;
  onShowSettings: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
};

const appendMessageDelta = (
  setMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void,
  id: string,
  delta: string
) => {
  setMessages((current) =>
    current.map((message) => (message.id === id ? { ...message, text: message.text + delta } : message))
  );
};

const agentActivityLabel = (name: string) => {
  if (name === 'agent_start' || name === 'turn_start') return 'Thinking...';
  if (name === 'tool_execution_start') return 'Running tool...';
  if (name === 'tool_execution_update') return 'Working...';
  if (name === 'tool_execution_end') return 'Reading results...';
  if (name === 'auto_retry_start') return 'Retrying...';
  return undefined;
};

const updateMessageActivity = (
  setMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void,
  id: string,
  activity?: string
) => {
  setMessages((current) =>
    current.map((message) => {
      if (message.id !== id) return message;
      if (activity) return { ...message, activity };

      const { activity: _activity, ...rest } = message;
      return rest;
    })
  );
};

export const useChat = ({ onShowChat, onShowSettings, textareaRef }: UseChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Checking Pi auth...');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [authProviders, setAuthProviders] = useState<ProviderAuthStatus[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState<string | undefined>();
  const [thinkingLevel, setThinkingLevel] = useState<EffortLevel>('medium');
  const assistantIdRef = useRef<string | null>(null);
  const terminalIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | undefined>();
  const previousUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.text ?? '',
    [messages]
  );
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
    selectedModelKeyState.value = modelList.selectedModelKey;
    setSelectedModelKey(modelList.selectedModelKey);
    if (modelList.error) setStatus(modelList.error);
  }, []);

  const clearSession = useCallback(() => {
    assistantIdRef.current = null;
    terminalIdRef.current = null;
    setDraft('');
    setMessages([]);
    setIsGenerating(false);
    updateActiveSessionId(undefined);
  }, []);

  useEffect(() => {
    void window.pi.chat.status().then((nextStatus) => {
      setStatus(nextStatus.ready ? `Using ${nextStatus.modelLabel}` : (nextStatus.error ?? 'Pi is not ready.'));
      selectedModelKeyState.value = nextStatus.selectedModelKey;
      setSelectedModelKey(nextStatus.selectedModelKey);
      if (nextStatus.sessionId) updateActiveSessionId(nextStatus.sessionId);
      if (nextStatus.thinkingLevel) setThinkingLevel(nextStatus.thinkingLevel);
    });

    void loadModels();
    void loadAuthProviders();

    const offShowSettings = window.pi.app.onShowSettings(onShowSettings);
    const offNewSession = window.pi.chat.onNewSession(() => {
      clearSession();
      onShowChat();
    });

    const offDelta = window.pi.chat.onDelta((delta) => {
      const id = assistantIdRef.current;
      if (id) {
        updateMessageActivity(setMessages, id);
        appendMessageDelta(setMessages, id, delta);
      }
    });

    const offDone = window.pi.chat.onDone(() => {
      const id = assistantIdRef.current;
      if (id) updateMessageActivity(setMessages, id);
      assistantIdRef.current = null;
      setIsGenerating(false);
      textareaRef.current?.focus();
    });

    const offCommandDelta = window.pi.chat.onCommandDelta((delta) => {
      const id = terminalIdRef.current;
      if (id) appendMessageDelta(setMessages, id, delta);
    });

    const offCommandDone = window.pi.chat.onCommandDone((output) => {
      const id = terminalIdRef.current;
      terminalIdRef.current = null;
      setIsGenerating(false);
      if (id && !output) {
        setMessages((current) =>
          current.map((message) =>
            message.id === id && !message.text ? { ...message, text: 'Command completed with no output.' } : message
          )
        );
      }
      textareaRef.current?.focus();
    });

    const offError = window.pi.chat.onError((message) => {
      assistantIdRef.current = null;
      terminalIdRef.current = null;
      setIsGenerating(false);
      setMessages((current) => [...current, createMessage('system', message)]);
    });

    const offEvent = window.pi.chat.onEvent((event) => {
      const id = assistantIdRef.current;
      const activity = agentActivityLabel(event.name);
      if (id && activity) updateMessageActivity(setMessages, id, activity);
    });

    return () => {
      offDone();
      offDelta();
      offError();
      offEvent();
      offNewSession();
      offShowSettings();
      offCommandDone();
      offCommandDelta();
    };
  }, [clearSession, loadAuthProviders, loadModels, onShowChat, onShowSettings, textareaRef, updateActiveSessionId]);

  const sendText = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text || isGenerating) return;

      const command = commandInput(text);
      if (commandMode(text)) {
        if (!command) return;

        const terminalMessage = createMessage('terminal', '');
        const userMessage = createMessage('user', text);
        terminalIdRef.current = terminalMessage.id;
        setDraft('');
        setIsGenerating(true);
        setMessages((current) => [...current, userMessage, terminalMessage]);

        const result = await window.pi.chat.command(command.command, command.excludeFromContext);
        if (result.sessionId) updateActiveSessionId(result.sessionId);
        if (!result.ok) {
          const terminalId = terminalIdRef.current;
          terminalIdRef.current = null;
          setIsGenerating(false);
          setMessages((current) => [
            ...current.filter((message) => message.id !== terminalId),
            createMessage('system', result.error ?? 'Command failed.')
          ]);
        }
        return;
      }

      const assistantMessage = createMessage('assistant', '');
      const userMessage = createMessage('user', text);
      assistantIdRef.current = assistantMessage.id;
      setDraft('');
      setIsGenerating(true);
      setMessages((current) => [...current, userMessage, assistantMessage]);

      const result = await window.pi.chat.send(text);
      if (result.sessionId) updateActiveSessionId(result.sessionId);
      if (!result.ok) {
        assistantIdRef.current = null;
        setIsGenerating(false);
        setMessages((current) => [...current, createMessage('system', result.error ?? 'Pi failed.')]);
      }
    },
    [isGenerating]
  );

  const send = useCallback(async () => {
    await sendText(draft);
  }, [draft, sendText]);

  const openSession = useCallback(
    async (path: string) => {
      const result = await window.pi.chat.openSession(path);
      if (!result.ok) {
        setStatus(result.error ?? 'Session could not be opened.');
        return false;
      }

      assistantIdRef.current = null;
      terminalIdRef.current = null;
      setDraft('');
      setIsGenerating(false);
      setMessages(result.messages ?? []);
      updateActiveSessionId(result.id);
      textareaRef.current?.focus();
      return true;
    },
    [textareaRef, updateActiveSessionId]
  );

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
    draft,
    models,
    send,
    status,
    sendText,
    messages,
    setDraft,
    saveApiKey,
    isGenerating,
    openSession,
    refreshSettings,
    selectModel,
    thinkingLevel,
    authProviders,
    selectedModelKey,
    activeSessionId,
    previousUserMessage,
    loginSubscription,
    selectThinkingLevel
  };
};
