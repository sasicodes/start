import type { EffortLevel } from '@preload/index';
import { EffortSignal } from '@renderer/shared/effort';
import { commandInput } from '@renderer/shared/input';
import { ArrowUpIcon, CodeIcon, StopIcon } from '@renderer/ui/icons';
import { CommonTooltip } from '@renderer/ui/tooltip';

type GenerateButtonProps = {
  draft: string;
  onStop: () => void;
  commandMode: boolean;
  isGenerating: boolean;
  previousMessage: string;
};

type ThinkingButtonProps = {
  level: EffortLevel;
  label: string;
  visible: boolean;
  onNext: () => void;
};

export const ThinkingButton = ({ label, level, visible, onNext }: ThinkingButtonProps) => {
  if (!visible) return null;

  return (
    <CommonTooltip label={label}>
      <button
        type="button"
        onClick={onNext}
        aria-label={`Thinking level ${label}`}
        class="grid h-9.5 w-10 place-items-center rounded-[3px_20px_20px_3px] border-0 bg-control text-ink select-none"
      >
        <EffortSignal className="-translate-x-px" level={level} />
      </button>
    </CommonTooltip>
  );
};

export const GenerateButton = ({ draft, onStop, commandMode, isGenerating, previousMessage }: GenerateButtonProps) => {
  if (isGenerating) {
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
      aria-label={commandMode ? 'Run command' : 'Send'}
      disabled={commandMode ? !commandInput(draft) : !draft.trim() && !previousMessage}
      class="relative grid size-9.5 place-items-center rounded-full border-0 bg-brand text-brand-ink shadow-nav select-none hover:opacity-90 disabled:pointer-events-none disabled:opacity-25 [&_svg]:size-4"
    >
      {commandMode ? <CodeIcon strokeWidth={2} /> : <ArrowUpIcon strokeWidth={2} />}
    </button>
  );
};
