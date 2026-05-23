import { commandInput } from '@renderer/shared/input';
import { ArrowUpIcon, CodeIcon, StopIcon } from '@renderer/ui/icons';

interface GenerateButtonProps {
  draft: string;
  onStop: () => void;
  commandMode: boolean;
  isGenerating: boolean;
}

export const GenerateButton = ({ draft, onStop, commandMode, isGenerating }: GenerateButtonProps) => {
  const hasDraft = draft.trim().length > 0;

  if (isGenerating && !hasDraft) {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-label="Stop"
        class="relative grid size-9.5 place-items-center rounded-full border-0 bg-brand text-brand-ink shadow-nav select-none hover:opacity-90 disabled:pointer-events-none disabled:opacity-25 [&_svg]:size-4"
      >
        <StopIcon />
      </button>
    );
  }

  return (
    <button
      type="submit"
      aria-label={isGenerating ? 'Queue follow-up' : commandMode ? 'Run command' : 'Send'}
      disabled={commandMode ? !commandInput(draft) || isGenerating : !hasDraft}
      class="relative grid size-9.5 place-items-center rounded-full border-0 bg-brand text-brand-ink shadow-nav select-none hover:opacity-90 disabled:pointer-events-none disabled:opacity-25 [&_svg]:size-4"
    >
      {commandMode ? <CodeIcon strokeWidth={2} /> : <ArrowUpIcon strokeWidth={2} />}
    </button>
  );
};
