import type { ChatEvent, QueuedMessage } from '@preload/index';
import { createTurn, createUserTurn } from '@renderer/functions/chat';
import { useAppFocusChange } from '@renderer/shared/app-focus';
import { drainStreamBuffer, type StreamEvent } from '@renderer/shared/chat/buffer';
import { createDeferredFlush } from '@renderer/shared/chat/flush';
import { endsMidWord } from '@renderer/shared/chat/segment';
import type { SettingsTab } from '@renderer/shared/settings/tab';
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
import { batch } from '@preact/signals';
import type { Turn } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

const streamingFlushDelayMs = 64;

interface MutableRef<T> {
  current: T;
}

interface UseChatEventsOptions {
  onShowChat: () => void;
  clearSession: () => void;
  onShowSettings: (tab: SettingsTab) => void;
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
    optionsRef.current.syncStatus().catch(() => {});
    optionsRef.current.loadModels().catch(() => {});
    optionsRef.current.loadAuthProviders().catch(() => {});
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

    let streamBuffer: StreamEvent[] = [];
    let assistantBuffer = '';
    let terminalBuffer = '';
    let textAssistantId = '';
    let lastAssistantChar = '';
    let activityClearedAssistantId: string | null = null;

    const flushStream = () => {
      const id = optionsRef.current.assistantIdRef.current;
      const events = streamBuffer;
      streamBuffer = [];
      if (!id || events.length === 0) return;
      drainStreamBuffer(events, {
        onThinking: (delta) => appendTurnThinking(id, delta),
        onDetails: (details) => appendTurnDetails(id, details)
      });
    };

    const flushAssistantDelta = () => {
      const id = optionsRef.current.assistantIdRef.current;
      const delta = assistantBuffer;
      assistantBuffer = '';
      if (id && delta) appendTurnDelta(id, delta);
    };

    const flushTerminalDelta = () => {
      const id = optionsRef.current.terminalIdRef.current;
      const delta = terminalBuffer;
      terminalBuffer = '';
      if (id && delta) appendTurnDelta(id, delta);
    };

    const flushTimers = {
      delayMs: streamingFlushDelayMs,
      clearTimeout: (id: number) => window.clearTimeout(id),
      setTimeout: (callback: () => void, delayMs: number) => window.setTimeout(callback, delayMs)
    };
    const streamFlush = createDeferredFlush(flushStream, flushTimers);
    const assistantFlush = createDeferredFlush(flushAssistantDelta, flushTimers);
    const terminalFlush = createDeferredFlush(flushTerminalDelta, flushTimers);

    const queueDetail = (detail: ChatEvent) => {
      streamBuffer.push({ kind: 'detail', event: detail });
      streamFlush.schedule();
    };

    const queueAssistantDelta = (delta: string) => {
      const id = optionsRef.current.assistantIdRef.current;
      if (id && delta) {
        if (textAssistantId !== id) lastAssistantChar = '';
        textAssistantId = id;
        lastAssistantChar = delta.slice(-1);
      }
      assistantBuffer += delta;
      assistantFlush.schedule();
    };

    const queueTerminalDelta = (delta: string) => {
      terminalBuffer += delta;
      terminalFlush.schedule();
    };

    const queueThinkingDelta = (delta: string) => {
      streamBuffer.push({ kind: 'thinking', delta });
      streamFlush.schedule();
    };

    const startActivitySegment = () => {
      const id = optionsRef.current.assistantIdRef.current;
      if (!id || textAssistantId !== id) return;
      if (endsMidWord(lastAssistantChar)) return;

      assistantFlush.flushNow();
      setTurnStreaming(id, false);

      const assistantTurn = { ...createTurn('assistant', ''), streaming: true };
      optionsRef.current.assistantIdRef.current = assistantTurn.id;
      activityClearedAssistantId = null;
      textAssistantId = '';
      setTurns((current) => [...current, assistantTurn]);
    };

    const finishAssistantTurn = (id: string) => {
      batch(() => {
        setTurnActivity(id);
        setTurnStreaming(id, false);
      });
    };

    const offShowSettings = window.pi.app.onShowSettings((tab) => optionsRef.current.onShowSettings(tab));
    const offNewSession = window.pi.chat.onNewSession(() => {
      clearSlashCommandsCache();
      if (optionsRef.current.assistantIdRef.current || optionsRef.current.terminalIdRef.current) {
        optionsRef.current.onShowChat();
        optionsRef.current.syncStatus().catch(() => {});
        return;
      }

      optionsRef.current.clearSession();
      optionsRef.current.onShowChat();
    });

    const offDelta = window.pi.chat.onDelta((delta) => {
      if (restoredStreaming()) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (id) {
        streamFlush.flushNow();
        if (activityClearedAssistantId !== id) {
          setTurnActivity(id);
          activityClearedAssistantId = id;
        }
        queueAssistantDelta(delta);
      }
    });

    const offThinkingDelta = window.pi.chat.onThinkingDelta((delta) => {
      if (restoredStreaming()) return;
      if (optionsRef.current.assistantIdRef.current) {
        startActivitySegment();
        queueThinkingDelta(delta);
      }
    });

    const offQueueUpdate = window.pi.chat.onQueueUpdate(setQueuedMessages);

    const offQueuedTurnStart = window.pi.chat.onQueuedTurnStart((turn) => {
      streamFlush.flushNow();
      assistantFlush.flushNow();
      const currentAssistantId = optionsRef.current.assistantIdRef.current;
      const userTurn = createUserTurn(turn.text, turn.attachments ?? []);
      const assistantTurn = { ...createTurn('assistant', ''), streaming: true };
      if (currentAssistantId) setTurnStreaming(currentAssistantId, false);
      optionsRef.current.assistantIdRef.current = assistantTurn.id;
      activityClearedAssistantId = null;
      textAssistantId = '';
      setIsGenerating(true);
      setTurns((current) => [...current, userTurn, assistantTurn]);
      scrollTurnToStart(userTurn.id);
    });

    const offDone = window.pi.chat.onDone(() => {
      if (restoredStreaming()) return;
      const id = optionsRef.current.assistantIdRef.current;
      streamFlush.flushNow();
      assistantFlush.flushNow();
      if (id) {
        finishAssistantTurn(id);
      }
      activityClearedAssistantId = null;
      textAssistantId = '';
      optionsRef.current.assistantIdRef.current = null;
      setIsGenerating(false);
      focusTextarea();
    });

    const offCommandDelta = window.pi.chat.onCommandDelta((delta) => {
      if (optionsRef.current.terminalIdRef.current) queueTerminalDelta(delta);
    });

    const offCommandDone = window.pi.chat.onCommandDone((output) => {
      const id = optionsRef.current.terminalIdRef.current;
      terminalFlush.flushNow();
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
      streamFlush.flushNow();
      assistantFlush.flushNow();
      terminalFlush.flushNow();
      if (assistantId) setTurnStreaming(assistantId, false);
      activityClearedAssistantId = null;
      textAssistantId = '';
      optionsRef.current.assistantIdRef.current = null;
      optionsRef.current.terminalIdRef.current = null;
      setIsGenerating(false);
      setTurns((current) => [...current, createTurn('system', turn)]);
    });

    const offEvent = window.pi.chat.onEvent((event) => {
      if (restoredStreaming()) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      startActivitySegment();
      queueDetail(event);
      const activity = turnActivityLabel(event);
      if (activity) setTurnActivity(optionsRef.current.assistantIdRef.current ?? id, activity);
    });

    const offScopedDelta = window.pi.chat.onScopedDelta(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      streamFlush.flushNow();
      if (activityClearedAssistantId !== id) {
        setTurnActivity(id);
        activityClearedAssistantId = id;
      }
      queueAssistantDelta(payload);
    });

    const offScopedThinkingDelta = window.pi.chat.onScopedThinkingDelta(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      if (optionsRef.current.assistantIdRef.current) {
        startActivitySegment();
        queueThinkingDelta(payload);
      }
    });

    const offScopedEvent = window.pi.chat.onScopedEvent(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      startActivitySegment();
      queueDetail(payload);
      const activity = turnActivityLabel(payload);
      if (activity) setTurnActivity(optionsRef.current.assistantIdRef.current ?? id, activity);
    });

    const offScopedDone = window.pi.chat.onScopedDone(({ tabId }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const id = optionsRef.current.assistantIdRef.current;
      streamFlush.flushNow();
      assistantFlush.flushNow();
      if (id) {
        finishAssistantTurn(id);
      }
      activityClearedAssistantId = null;
      textAssistantId = '';
      optionsRef.current.assistantIdRef.current = null;
      setIsGenerating(false);
      focusTextarea();
    });

    const offScopedError = window.pi.chat.onScopedError(({ tabId, payload }) => {
      if (!restoredStreaming()) return;
      if (!activeScopedSession(tabId)) return;
      const assistantId = optionsRef.current.assistantIdRef.current;
      streamFlush.flushNow();
      assistantFlush.flushNow();
      if (assistantId) setTurnStreaming(assistantId, false);
      activityClearedAssistantId = null;
      textAssistantId = '';
      optionsRef.current.assistantIdRef.current = null;
      setIsGenerating(false);
      setTurns((current) => [...current, createTurn('system', payload)]);
    });

    const offStatusChanged = window.pi.chat.onStatusChanged(refreshChatState);
    const offWorkspaceOpened = window.pi.chat.onWorkspaceOpened(() => {
      clearSlashCommandsCache();
      optionsRef.current.clearSession();
      optionsRef.current.syncStatus().catch(() => {});
      optionsRef.current.onShowChat();
    });
    const offResourcesRefreshed = window.pi.chat.onResourcesRefreshed(clearSlashCommandsCache);

    return () => {
      offDone();
      offDelta();
      offError();
      offEvent();
      offNewSession();
      offQueueUpdate();
      offStatusChanged();
      offWorkspaceOpened();
      offResourcesRefreshed();
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
      streamFlush.cancel();
      assistantFlush.cancel();
      terminalFlush.cancel();
    };
  }, [refreshChatState]);
};
