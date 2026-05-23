import type { EffortLevel } from '@preload/index';
import { EffortSignal } from '@renderer/shared/effort';
import { Tooltip } from '@renderer/ui/tooltip';

interface ThinkingButtonProps {
  disabled: boolean;
  level: EffortLevel;
  label: string;
  visible: boolean;
  onNext: () => void;
}

export const ThinkingButton = ({ disabled, label, level, visible, onNext }: ThinkingButtonProps) => {
  if (!visible) return null;

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
