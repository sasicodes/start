import { commandInput } from '@renderer/shared/input';

interface SubmitState {
  draft: string;
  commandMode: boolean;
  isGenerating: boolean;
  disabledReason?: string;
}

interface StopState {
  stopping: boolean;
  isGenerating: boolean;
}

export const composerHasDraft = (draft: string) => draft.trim().length > 0;

export const composerStopping = ({ stopping, isGenerating }: StopState) => stopping && isGenerating;

export const composerShowsStop = (draft: string, isGenerating: boolean) => isGenerating && !composerHasDraft(draft);

export const composerSubmitDisabled = ({ draft, commandMode, isGenerating, disabledReason }: SubmitState) =>
  Boolean(disabledReason) || (commandMode ? !commandInput(draft) || isGenerating : !composerHasDraft(draft));
