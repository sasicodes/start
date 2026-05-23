import type { ChatEvent } from '@preload/index';
import { createTurn } from '@renderer/functions/chat';
import {
  turnActivityLabel,
  appendTurnDelta,
  appendTurnDetails,
  appendTurnThinking,
  setTurnActivity,
  setTurnStreaming
} from '@renderer/shared/turn/state';
import type { Turn } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

type MutableRef<T> = {
  current: T;
};

type UseChatEventsOptions = {
  onShowChat: () => void;
  clearSession: () => void;
  loadModels: () => Promise<void>;
  syncStatus: () => Promise<void>;
  onShowSettings: () => void;
  setIsGenerating: (value: boolean) => void;
  setTurns: (updater: (current: Turn[]) => Turn[]) => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
  assistantIdRef: MutableRef<string | null>;
  terminalIdRef: MutableRef<string | null>;
};

export const useChatEvents = ({
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
}: UseChatEventsOptions) => {
  useEffect(() => {
    void syncStatus();
    void loadModels();

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
      const id = assistantIdRef.current;
      const details = detailBuffer;
      detailBuffer = [];
      if (id && details.length > 0) appendTurnDetails(setTurns, id, details);
    };

    const flushAssistantDelta = () => {
      assistantFrame = 0;
      const id = assistantIdRef.current;
      const delta = assistantBuffer;
      assistantBuffer = '';
      if (id && delta) appendTurnDelta(setTurns, id, delta);
    };

    const flushTerminalDelta = () => {
      terminalFrame = 0;
      const id = terminalIdRef.current;
      const delta = terminalBuffer;
      terminalBuffer = '';
      if (id && delta) appendTurnDelta(setTurns, id, delta);
    };

    const flushThinkingDelta = () => {
      thinkingFrame = 0;
      const id = assistantIdRef.current;
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

    const offShowSettings = window.pi.app.onShowSettings(onShowSettings);
    const offNewSession = window.pi.chat.onNewSession(() => {
      clearSession();
      onShowChat();
    });

    const offDelta = window.pi.chat.onDelta((delta) => {
      const id = assistantIdRef.current;
      if (id) {
        if (activityClearedAssistantId !== id) {
          setTurnActivity(setTurns, id);
          activityClearedAssistantId = id;
        }
        queueAssistantDelta(delta);
      }
    });

    const offThinkingDelta = window.pi.chat.onThinkingDelta((delta) => {
      if (assistantIdRef.current) queueThinkingDelta(delta);
    });

    const offDone = window.pi.chat.onDone(() => {
      const id = assistantIdRef.current;
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
      assistantIdRef.current = null;
      setIsGenerating(false);
      textareaRef.current?.focus();
    });

    const offCommandDelta = window.pi.chat.onCommandDelta((delta) => {
      if (terminalIdRef.current) queueTerminalDelta(delta);
    });

    const offCommandDone = window.pi.chat.onCommandDone((output) => {
      const id = terminalIdRef.current;
      if (terminalFrame) cancelAnimationFrame(terminalFrame);
      flushTerminalDelta();
      terminalIdRef.current = null;
      setIsGenerating(false);
      if (id && !output) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id && !turn.text ? { ...turn, text: 'Command completed with no output.' } : turn
          )
        );
      }
      textareaRef.current?.focus();
    });

    const offError = window.pi.chat.onError((turn) => {
      const assistantId = assistantIdRef.current;
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
      assistantIdRef.current = null;
      terminalIdRef.current = null;
      setIsGenerating(false);
      setTurns((current) => [...current, createTurn('system', turn)]);
    });

    const offEvent = window.pi.chat.onEvent((event) => {
      const id = assistantIdRef.current;
      if (!id) return;

      queueDetail(event);
      const activity = turnActivityLabel(event);
      if (activity) setTurnActivity(setTurns, id, activity);
    });

    const offStatusChanged = window.pi.chat.onStatusChanged(() => {
      void syncStatus();
      void loadModels();
    });

    const offFocusStateChanged = window.pi.app.onFocusStateChanged((state) => {
      if (!state.focused) return;

      void syncStatus();
      void loadModels();
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
  }, [
    onShowChat,
    loadModels,
    setTurns,
    syncStatus,
    textareaRef,
    clearSession,
    terminalIdRef,
    assistantIdRef,
    onShowSettings,
    setIsGenerating
  ]);
};
