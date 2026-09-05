import type { usePendingAttachments } from '@renderer/app/attachments';
import type { useComposerOverlay } from '@renderer/app/composer-overlay';
import { routeForSession, type useAppNavigation } from '@renderer/app/navigation';
import type { useChat } from '@renderer/shared/chat/use-chat';
import { newSessionMention } from '@renderer/shared/input';
import { useCallback, useEffect } from 'preact/hooks';

interface ComposerOptions
  extends Pick<
      ReturnType<typeof useChat>,
      'send' | 'draft' | 'setDraft' | 'sendText' | 'startSession' | 'activeSessionId'
    >,
    Pick<ReturnType<typeof useAppNavigation>, 'surface' | 'navigate' | 'setSurface'>,
    Pick<ReturnType<typeof usePendingAttachments>, 'attachments' | 'setAttachments'>,
    Pick<ReturnType<typeof useComposerOverlay>, 'composerExiting' | 'finishComposerExit'> {
  clearPendingAttachments: () => void;
}

export const useAppComposer = ({
  send,
  draft,
  surface,
  setDraft,
  sendText,
  navigate,
  setSurface,
  startSession,
  attachments,
  activeSessionId,
  setAttachments,
  composerExiting,
  finishComposerExit,
  clearPendingAttachments
}: ComposerOptions) => {
  const discardComposerDraft = useCallback(() => {
    clearPendingAttachments();
    setDraft('');
  }, [clearPendingAttachments, setDraft]);

  useEffect(() => {
    return window.pi.app.onDiscardComposer(discardComposerDraft);
  }, [discardComposerDraft]);

  useEffect(() => {
    return window.pi.app.onSubmitComposer((prompt, incomingAttachments) => {
      setSurface('main');
      clearPendingAttachments();
      const mention = newSessionMention(prompt);
      if (mention) {
        if (mention.prompt) startSession(mention.prompt, incomingAttachments);
        return;
      }
      navigate(routeForSession(activeSessionId), true);
      sendText(prompt, incomingAttachments);
    });
  }, [activeSessionId, clearPendingAttachments, navigate, sendText, setSurface, startSession]);

  const submitDraft = useCallback(() => {
    if (!draft.trim() || composerExiting) return;

    const pendingAttachments = attachments;

    if (surface === 'composer') {
      finishComposerExit(() => {
        setAttachments([]);
        window.pi.app.submitComposer(draft, pendingAttachments).catch(() => {});
        setDraft('');
      });
      return;
    }

    setAttachments([]);
    const mention = newSessionMention(draft);
    if (mention) {
      setDraft('');
      if (mention.prompt) startSession(mention.prompt, pendingAttachments);
      return;
    }
    send(pendingAttachments);
  }, [attachments, composerExiting, draft, finishComposerExit, send, setDraft, startSession, surface]);

  const discardComposerOverlay = useCallback(() => {
    if (surface !== 'composer' || composerExiting) return;
    finishComposerExit(() => {
      window.pi.app.hideComposer().catch(() => {});
    });
  }, [composerExiting, finishComposerExit, surface]);

  useEffect(() => {
    return window.pi.app.onHideComposerRequest(discardComposerOverlay);
  }, [discardComposerOverlay]);

  return { submitDraft, discardComposerOverlay };
};
