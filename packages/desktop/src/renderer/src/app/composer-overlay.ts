import type { AppSurface } from '@renderer/app/types';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface ComposerOverlayOptions {
  textareaRef: RefObject<HTMLTextAreaElement>;
  setSurface: (surface: AppSurface) => void;
}

export const useComposerOverlay = ({ setSurface, textareaRef }: ComposerOverlayOptions) => {
  const [composerRevealKey, setComposerRevealKey] = useState(0);
  const [composerExiting, setComposerExiting] = useState(false);
  const composerExitFinishRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    let focusFrame = 0;
    const offShowComposer = window.pi.app.onShowComposer(() => {
      if (focusFrame) cancelAnimationFrame(focusFrame);
      composerExitFinishRef.current = undefined;
      setComposerExiting(false);
      setSurface('composer');
      setComposerRevealKey((key) => key + 1);
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        textareaRef.current?.focus();
      });
    });

    return () => {
      offShowComposer();
      if (focusFrame) cancelAnimationFrame(focusFrame);
    };
  }, [setSurface, textareaRef]);

  const finishComposerExit = useCallback((finish: () => void) => {
    composerExitFinishRef.current = finish;
    setComposerExiting(true);
  }, []);

  const completeComposerExit = useCallback(() => {
    const finish = composerExitFinishRef.current;
    composerExitFinishRef.current = undefined;
    setComposerExiting(false);
    finish?.();
  }, []);

  return {
    composerExiting,
    composerRevealKey,
    finishComposerExit,
    completeComposerExit
  };
};
