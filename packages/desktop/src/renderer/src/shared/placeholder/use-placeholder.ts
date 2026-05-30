import { useAppFocusState } from '@renderer/shared/app-focus';
import { promptPlaceholder, promptPlaceholderCycleMs } from '@renderer/shared/placeholder';
import { contextPercentState } from '@renderer/state/chat';
import { useEffect, useState } from 'preact/hooks';

interface PromptPlaceholderOptions {
  draft: string;
  hasTurns: boolean;
  isCommandMode: boolean;
}

export const usePromptPlaceholder = ({ draft, hasTurns, isCommandMode }: PromptPlaceholderOptions) => {
  const isEmpty = draft.length === 0;
  const canRotate = isEmpty && !isCommandMode;
  const appFocused = useAppFocusState(canRotate);
  const rotating = appFocused && canRotate;
  const contextPercent = contextPercentState.value;
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (!rotating) {
      setPlaceholderIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => current + 1);
    }, promptPlaceholderCycleMs);

    return () => window.clearInterval(timer);
  }, [rotating]);

  const placeholder = promptPlaceholder(hasTurns, isCommandMode, contextPercent, placeholderIndex);

  return {
    label: placeholder,
    placeholder
  };
};
