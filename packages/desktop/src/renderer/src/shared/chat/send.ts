import type { CommandResult, ImageAttachment, SendResult } from '@preload/index';
import { createTurn } from '@renderer/functions/chat';
import type { TurnUpdater } from '@renderer/shared/chat/turn-summary';
import { commandInput, commandMode } from '@renderer/shared/input';
import { scrollTurnToStart } from '@renderer/shared/turn/scroll';
import { useCallback } from 'preact/hooks';

interface MutableRef<T> {
  current: T;
}

interface UseChatSendOptions {
  draft: string;
  isGenerating: boolean;
  setDraft: (value: string) => void;
  setTurns: TurnUpdater;
  setIsGenerating: (value: boolean) => void;
  setLoadedSessionId: (sessionId: string) => void;
  updateActiveSessionId: (sessionId: string | undefined) => void;
  terminalIdRef: MutableRef<string | null>;
  assistantIdRef: MutableRef<string | null>;
  sessionRequestRef: MutableRef<number>;
}

export const useChatSend = ({
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
}: UseChatSendOptions) => {
  const sendText = useCallback(
    async (value: string, attachments: ImageAttachment[] = []) => {
      const text = value.trim();
      if (!text) return;

      const command = commandInput(text);
      if (commandMode(text)) {
        if (!command || isGenerating) return;

        const requestId = sessionRequestRef.current + 1;
        const terminalTurn = createTurn('terminal', '');
        const userTurn = createTurn('user', text);
        sessionRequestRef.current = requestId;
        terminalIdRef.current = terminalTurn.id;
        setDraft('');
        setIsGenerating(true);
        setTurns((current) => [...current, userTurn, terminalTurn]);
        scrollTurnToStart(userTurn.id);

        let result: CommandResult;
        try {
          result = await window.pi.chat.command(command.command, command.excludeFromContext);
        } catch {
          if (sessionRequestRef.current !== requestId) return;
          const terminalId = terminalIdRef.current;
          terminalIdRef.current = null;
          setIsGenerating(false);
          setTurns((current) => [
            ...current.filter((turn) => turn.id !== terminalId),
            createTurn('system', 'Command failed.')
          ]);
          return;
        }
        if (sessionRequestRef.current !== requestId) return;
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

      if (isGenerating) {
        setDraft('');
        try {
          const result = await window.pi.chat.send(text, attachments);
          if (result.sessionId) updateActiveSessionId(result.sessionId);
          if (!result.ok)
            setTurns((current) => [...current, createTurn('system', result.error ?? 'Message could not be queued.')]);
        } catch {
          setTurns((current) => [...current, createTurn('system', 'Message could not be queued.')]);
        }
        return;
      }

      const requestId = sessionRequestRef.current + 1;
      const assistantTurn = { ...createTurn('assistant', ''), streaming: true };
      const userTurn = createTurn('user', text);
      sessionRequestRef.current = requestId;
      assistantIdRef.current = assistantTurn.id;
      setDraft('');
      setIsGenerating(true);
      setTurns((current) => [...current, userTurn, assistantTurn]);
      scrollTurnToStart(userTurn.id);

      let result: SendResult;
      try {
        result = await window.pi.chat.send(text, attachments);
      } catch {
        if (sessionRequestRef.current !== requestId) return;
        const assistantId = assistantIdRef.current;
        if (!assistantId) return;

        assistantIdRef.current = null;
        setIsGenerating(false);
        setTurns((current) => [
          ...current.map((turn) => (turn.id === assistantId ? { ...turn, streaming: false } : turn)),
          createTurn('system', 'Request failed.')
        ]);
        return;
      }
      if (sessionRequestRef.current !== requestId) return;
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
          createTurn('system', result.error ?? 'Request failed.')
        ]);
      }
    },
    [
      setDraft,
      setTurns,
      isGenerating,
      terminalIdRef,
      assistantIdRef,
      setIsGenerating,
      sessionRequestRef,
      setLoadedSessionId,
      updateActiveSessionId
    ]
  );

  const send = useCallback(
    async (attachments: ImageAttachment[] = []) => {
      await sendText(draft, attachments);
    },
    [draft, sendText]
  );

  return { send, sendText };
};
