import type { EffortLevel } from '@preload/index';
import { EffortSignal } from '@renderer/shared/effort';
import { Tooltip } from '@renderer/ui/tooltip';

interface ThinkingProps {
  disabled: boolean;
  level: EffortLevel;
  label: string;
  onNext: () => void;
}

export const Thinking = ({ disabled, label, level, onNext }: ThinkingProps) => {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        disabled={disabled}
        onClick={onNext}
        aria-label={`Thinking level ${label}`}
        class="grid h-9.5 w-10 place-items-center rounded-[3px_20px_20px_3px] border-0 bg-control text-ink select-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <EffortSignal className="-translate-x-px" level={level} />
      </button>
    </Tooltip>
  );
};
