import { useAppFocusState } from '@renderer/shared/use-app-focus-state';

const defaultPromptPlaceholder = 'Ask to plan or work on something';
const emptyPromptPlaceholders = [
  defaultPromptPlaceholder,
  'Type @ to attach workspace files',
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
  const placeholder = promptPlaceholder(hasTurns, isCommandMode);

  return {
    label: placeholder,
    placeholder: rotating ? '' : placeholder,
    placeholders: emptyPromptPlaceholders,
    rotating
  };
};
