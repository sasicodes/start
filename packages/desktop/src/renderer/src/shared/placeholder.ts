import { useAppFocusState } from '@renderer/shared/app-focus';
import { useEffect, useState } from 'preact/hooks';

const promptPlaceholderCycleMs = 10000;
const defaultPromptPlaceholder = 'Ask to plan or work on something';
const emptyPromptPlaceholders = [
  defaultPromptPlaceholder,
  'Type @ to attach workspace files',
  'Type / to load a skill',
  'Type ! to run a shell command',
  'Type ~/ to attach files from home'
];

interface PromptPlaceholderOptions {
  centered: boolean;
  draft: string;
  hasTurns: boolean;
  isCommandMode: boolean;
}

export const promptPlaceholder = (hasTurns: boolean, isCommandMode: boolean, index = 0) => {
  if (isCommandMode) return 'Run a shell command';
  if (hasTurns) return 'Ask for follow-up changes';
  return emptyPromptPlaceholders[index % emptyPromptPlaceholders.length] ?? defaultPromptPlaceholder;
};

export const usePromptPlaceholder = ({ centered, draft, hasTurns, isCommandMode }: PromptPlaceholderOptions) => {
  const canRotate = centered && draft.length === 0 && !hasTurns && !isCommandMode;
  const appFocused = useAppFocusState(canRotate);
  const rotating = appFocused && canRotate;
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (!rotating) {
      setPlaceholderIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % emptyPromptPlaceholders.length);
    }, promptPlaceholderCycleMs);

    return () => window.clearInterval(timer);
  }, [rotating]);

  const placeholder = promptPlaceholder(hasTurns, isCommandMode, rotating ? placeholderIndex : 0);

  return {
    label: placeholder,
    placeholder
  };
};
