import type { EffortLevel } from '@preload/index';
import { EffortSignal } from '@renderer/shared/effort';
import { Tooltip } from '@renderer/ui/tooltip';

interface ThinkingButtonProps {
  level: EffortLevel;
  label: string;
  visible: boolean;
  onNext: () => void;
}

export const ThinkingButton = ({ label, level, visible, onNext }: ThinkingButtonProps) => {
  if (!visible) return null;

  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onNext}
        aria-label={`Thinking level ${label}`}
        class="grid h-9.5 w-10 place-items-center rounded-[3px_20px_20px_3px] border-0 bg-control text-ink select-none"
      >
        <EffortSignal className="-translate-x-px" level={level} />
      </button>
    </Tooltip>
  );
};
