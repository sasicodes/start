import { composerIsLayered } from '@renderer/shared/composer/layout';
import { initialComposerTextareaLayoutState, syncComposerTextareaLayout } from '@renderer/shared/composer/textarea';
import type { RefObject } from 'preact';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';

interface TextareaOptions {
  draft: string;
  singleLine: boolean;
  hasAttachments: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export const useComposerTextarea = ({ draft, singleLine, hasAttachments, textareaRef }: TextareaOptions) => {
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaLayoutRef = useRef(initialComposerTextareaLayoutState());
  const [isMultiline, setIsMultiline] = useState(false);
  const layered = composerIsLayered({ singleLine, hasAttachments, multiline: isMultiline });

  const resetTextareaLayout = useCallback((element: HTMLTextAreaElement) => {
    element.style.height = '';
    textareaLayoutRef.current = initialComposerTextareaLayoutState();
    setIsMultiline(false);
  }, []);
  const updateTextareaLayout = useCallback((element: HTMLTextAreaElement, value: string) => {
    const nextLayout = syncComposerTextareaLayout(element, value, textareaLayoutRef.current);
    textareaLayoutRef.current = nextLayout;
    setIsMultiline(nextLayout.multiline);
  }, []);
  const setPromptInputRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      promptInputRef.current = element;
      textareaRef.current = element;
      if (element && !singleLine) updateTextareaLayout(element, draft);
    },
    [draft, singleLine, textareaRef, updateTextareaLayout]
  );

  useLayoutEffect(() => {
    const element = promptInputRef.current;
    if (!element || singleLine) {
      if (element) resetTextareaLayout(element);
      return;
    }
    updateTextareaLayout(element, draft);
  }, [draft, layered, resetTextareaLayout, singleLine, updateTextareaLayout]);

  return { layered, setPromptInputRef };
};
