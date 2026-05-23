import type { ChatEvent } from '@preload/index';
import { createTurn } from '@renderer/functions/chat';
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
import { useEffect, useRef } from 'preact/hooks';

interface MutableRef<T> {
  current: T;
}

interface UseChatEventsOptions {
  onShowChat: () => void;
  clearSession: () => void;
  loadModels: () => Promise<void>;
  syncStatus: () => Promise<void>;
  onShowSettings: () => void;
  setIsGenerating: (value: boolean) => void;
  setTurns: (updater: (current: Turn[]) => Turn[]) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  assistantIdRef: MutableRef<string | null>;
  terminalIdRef: MutableRef<string | null>;
}

export const useChatEvents = (options: UseChatEventsOptions) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const refreshChatState = () => {
      void optionsRef.current.syncStatus().catch(() => {});
      void optionsRef.current.loadModels().catch(() => {});
    };
    const setTurns = (updater: (current: Turn[]) => Turn[]) => optionsRef.current.setTurns(updater);
    const setIsGenerating = (value: boolean) => optionsRef.current.setIsGenerating(value);
    const focusTextarea = () => optionsRef.current.textareaRef.current?.focus();

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
      optionsRef.current.clearSession();
      optionsRef.current.onShowChat();
    });

    const offDelta = window.pi.chat.onDelta((delta) => {
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
      if (optionsRef.current.assistantIdRef.current) queueThinkingDelta(delta);
    });

    const offDone = window.pi.chat.onDone(() => {
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
      const id = optionsRef.current.assistantIdRef.current;
      if (!id) return;

      queueDetail(event);
      const activity = turnActivityLabel(event);
      if (activity) setTurnActivity(setTurns, id, activity);
    });

    const offStatusChanged = window.pi.chat.onStatusChanged(refreshChatState);

    const offFocusStateChanged = window.pi.app.onFocusStateChanged((state) => {
      if (state.focused) refreshChatState();
    });

    return () => {
      offDone();
      offDelta();
      offError();
      offEvent();
      offNewSession();
      offStatusChanged();
      offThinkingDelta();
      offFocusStateChanged();
      offShowSettings();
      offCommandDone();
      offCommandDelta();
      if (detailFrame) cancelAnimationFrame(detailFrame);
      if (assistantFrame) cancelAnimationFrame(assistantFrame);
      if (terminalFrame) cancelAnimationFrame(terminalFrame);
      if (thinkingFrame) cancelAnimationFrame(thinkingFrame);
    };
  }, []);
};
