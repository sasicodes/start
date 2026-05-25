import type { ChatEvent, QueuedMessage } from '@preload/index';
import { createTurn } from '@renderer/functions/chat';
import { useAppFocusChange } from '@renderer/shared/app-focus';
import { clearSlashCommandsCache } from '@renderer/shared/slash-commands';
import { scrollTurnToStart } from '@renderer/shared/turn/scroll';
import {
  appendTurnDelta,
  appendTurnDetails,
  appendTurnThinking,
  setTurnActivity,
  setTurnStreaming,
  turnActivityLabel
} from '@renderer/shared/turn/state';
import type { Turn } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

interface MutableRef<T> {
  current: T;
}

interface UseChatEventsOptions {
  onShowChat: () => void;
  clearSession: () => void;
  onShowSettings: () => void;
  loadModels: () => Promise<void>;
  loadAuthProviders: () => Promise<void>;
  syncStatus: () => Promise<void>;
  workspacePath: string;
  activeSessionId: string;
  terminalIdRef: MutableRef<string | null>;
  setIsGenerating: (value: boolean) => void;
  assistantIdRef: MutableRef<string | null>;
  textareaRef: RefObject<HTMLTextAreaElement>;
  setQueuedMessages: (messages: QueuedMessage[]) => void;
  setTurns: (updater: (current: Turn[]) => Turn[]) => void;
}

export const useChatEvents = (options: UseChatEventsOptions) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refreshChatState = useCallback(() => {
    void optionsRef.current.syncStatus().catch(() => {});
    void optionsRef.current.loadModels().catch(() => {});
    void optionsRef.current.loadAuthProviders().catch(() => {});
  }, []);

  useAppFocusChange((focused) => {
    if (focused) refreshChatState();
  });

  useEffect(() => {
    const setTurns = (updater: (current: Turn[]) => Turn[]) => optionsRef.current.setTurns(updater);
    const setIsGenerating = (value: boolean) => optionsRef.current.setIsGenerating(value);
    const setQueuedMessages = (messages: QueuedMessage[]) => optionsRef.current.setQueuedMessages(messages);
    const focusTextarea = () => optionsRef.current.textareaRef.current?.focus();
    const restoredStreaming = () => optionsRef.current.assistantIdRef.current?.startsWith('streaming:') ?? false;
    const activeScopedSession = (tabId: string) => optionsRef.current.activeSessionId === tabId;

    refreshChatState();

    let detailBuffer: ChatEvent[] = [];
    let assistantBuffer = '';
    let terminalBuffer = '';
    let thinkingBuffer = '';
    let detailFrame = 0;
    let assistantFrame = 0;
    let terminalFrame = 0;
    let thinkingFrame = 0;
    let activityClearedAssistantId: string | null = null;

    const flushDetails = () => {
      detailFrame = 0;
      const id = optionsRef.current.assistantIdRef.current;
      const details = detailBuffer;
      detailBuffer = [];
      if (id && details.length > 0) appendTurnDetails(setTurns, id, details);
    };

    const flushAssistantDelta = () => {
      assistantFrame = 0;
      const id = optionsRef.current.assistantIdRef.current;
      const delta = assistantBuffer;
      assistantBuffer = '';
      if (id && delta) appendTurnDelta(setTurns, id, delta);
    };

    const flushTerminalDelta = () => {
      terminalFrame = 0;
      const id = optionsRef.current.terminalIdRef.current;
      const delta = terminalBuffer;
      terminalBuffer = '';
      if (id && delta) appendTurnDelta(setTurns, id, delta);
    };

    const flushThinkingDelta = () => {
      thinkingFrame = 0;
      const id = optionsRef.current.assistantIdRef.current;
      const delta = thinkingBuffer;
      thinkingBuffer = '';
      if (id && delta) appendTurnThinking(setTurns, id, delta);
    };

    const queueDetail = (detail: ChatEvent) => {
      detailBuffer.push(detail);
      if (!detailFrame) detailFrame = requestAnimationFrame(flushDetails);
    };

    const queueAssistantDelta = (delta: string) => {
      assistantBuffer += delta;
      if (!assistantFrame) assistantFrame = requestAnimationFrame(flushAssistantDelta);
    };

    const queueTerminalDelta = (delta: string) => {
      terminalBuffer += delta;
      if (!terminalFrame) terminalFrame = requestAnimationFrame(flushTerminalDelta);
    };

    const queueThinkingDelta = (delta: string) => {
      thinkingBuffer += delta;
      if (!thinkingFrame) thinkingFrame = requestAnimationFrame(flushThinkingDelta);
    };

    const offShowSettings = window.pi.app.onShowSettings(() => optionsRef.current.onShowSettings());
    const offNewSession = window.pi.chat.onNewSession(() => {
      clearSlashCommandsCache();
      if (optionsRef.current.assistantIdRef.current || optionsRef.current.terminalIdRef.current) {
        optionsRef.current.onShowChat();
        void optionsRef.current.syncStatus().catch(() => {});
        return;
      }

      optionsRef.current.clearSession();
      optionsRef.current.onShowChat();
    });

    const offDelta = window.pi.chat.onDelta((delta) => {
      if (restoredStreaming()) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (id) {
        if (activityClearedAssistantId !== id) {
          setTurnActivity(setTurns, id);
          activityClearedAssistantId = id;
        }
        queueAssistantDelta(delta);
      }
    });

    const offThinkingDelta = window.pi.chat.onThinkingDelta((delta) => {
      if (restoredStreaming()) return;
      if (optionsRef.current.assistantIdRef.current) queueThinkingDelta(delta);
    });

    const offQueueUpdate = window.pi.chat.onQueueUpdate(setQueuedMessages);

    const offQueuedTurnStart = window.pi.chat.onQueuedTurnStart((turn) => {
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
      flushDetails();
      flushAssistantDelta();
      flushThinkingDelta();
      const currentAssistantId = optionsRef.current.assistantIdRef.current;
      const userTurn = createTurn('user', turn.text);
      const assistantTurn = { ...createTurn('assistant', ''), streaming: true };
      if (currentAssistantId) setTurnStreaming(setTurns, currentAssistantId, false);
      optionsRef.current.assistantIdRef.current = assistantTurn.id;
      activityClearedAssistantId = null;
      setIsGenerating(true);
      setTurns((current) => [...current, userTurn, assistantTurn]);
      scrollTurnToStart(userTurn.id);
    });

    const offDone = window.pi.chat.onDone(() => {
      if (restoredStreaming()) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
      flushDetails();
      flushAssistantDelta();
      flushThinkingDelta();
      if (id) {
        setTurnActivity(setTurns, id);
        setTurnStreaming(setTurns, id, false);
      }
      activityClearedAssistantId = null;
      optionsRef.current.assistantIdRef.current = null;
      setIsGenerating(false);
      focusTextarea();
    });

    const offCommandDelta = window.pi.chat.onCommandDelta((delta) => {
      if (optionsRef.current.terminalIdRef.current) queueTerminalDelta(delta);
    });

    const offCommandDone = window.pi.chat.onCommandDone((output) => {
      const id = optionsRef.current.terminalIdRef.current;
      if (terminalFrame) cancelAnimationFrame(terminalFrame);
      flushTerminalDelta();
      optionsRef.current.terminalIdRef.current = null;
      setIsGenerating(false);
      if (id && !output) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id && !turn.text ? { ...turn, text: 'Command completed with no output.' } : turn
          )
        );
      }
      focusTextarea();
    });

    const offError = window.pi.chat.onError((turn) => {
      if (restoredStreaming()) return;
      const assistantId = optionsRef.current.assistantIdRef.current;
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (terminalFrame) cancelAnimationFrame(terminalFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
      flushDetails();
      flushAssistantDelta();
      flushTerminalDelta();
      flushThinkingDelta();
      if (assistantId) setTurnStreaming(setTurns, assistantId, false);
      activityClearedAssistantId = null;
      optionsRef.current.assistantIdRef.current = null;
      optionsRef.current.terminalIdRef.current = null;
      setIsGenerating(false);
      setTurns((current) => [...current, createTurn('system', turn)]);
    });

    const offEvent = window.pi.chat.onEvent((event) => {
      if (restoredStreaming()) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      queueDetail(event);
      const activity = turnActivityLabel(event);
      if (activity) setTurnActivity(setTurns, id, activity);
    });

    const offScopedDelta = window.pi.chat.onScopedDelta(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      if (activityClearedAssistantId !== id) {
        setTurnActivity(setTurns, id);
        activityClearedAssistantId = id;
      }
      queueAssistantDelta(payload);
    });

    const offScopedThinkingDelta = window.pi.chat.onScopedThinkingDelta(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      if (optionsRef.current.assistantIdRef.current) queueThinkingDelta(payload);
    });

    const offScopedEvent = window.pi.chat.onScopedEvent(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      queueDetail(payload);
      const activity = turnActivityLabel(payload);
      if (activity) setTurnActivity(setTurns, id, activity);
    });

    const offScopedDone = window.pi.chat.onScopedDone(({ tabId }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
      flushDetails();
      flushAssistantDelta();
      flushThinkingDelta();
      if (id) {
        setTurnActivity(setTurns, id);
        setTurnStreaming(setTurns, id, false);
      }
      activityClearedAssistantId = null;
      optionsRef.current.assistantIdRef.current = null;
      setIsGenerating(false);
      focusTextarea();
    });

    const offScopedError = window.pi.chat.onScopedError(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const assistantId = optionsRef.current.assistantIdRef.current;
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
      flushDetails();
      flushAssistantDelta();
      flushThinkingDelta();
      if (assistantId) setTurnStreaming(setTurns, assistantId, false);
      activityClearedAssistantId = null;
      optionsRef.current.assistantIdRef.current = null;
      setIsGenerating(false);
      setTurns((current) => [...current, createTurn('system', payload)]);
    });

    const offStatusChanged = window.pi.chat.onStatusChanged(refreshChatState);

    return () => {
      offDone();
      offDelta();
      offError();
      offEvent();
      offNewSession();
      offQueueUpdate();
      offStatusChanged();
      offScopedDone();
      offScopedError();
      offScopedEvent();
      offScopedDelta();
      offThinkingDelta();
      offScopedThinkingDelta();
      offQueuedTurnStart();
      offShowSettings();
      offCommandDone();
      offCommandDelta();
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (terminalFrame) cancelAnimationFrame(terminalFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
    };
  }, [refreshChatState]);
};
