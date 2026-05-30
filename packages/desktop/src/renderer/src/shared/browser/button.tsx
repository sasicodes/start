import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface BrowserButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tooltipLabel?: string;
  children: ComponentChildren;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

export const BrowserButton = ({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
  tooltipLabel = '',
  tooltipSide = 'top'
}: BrowserButtonProps) => {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      class={tw(
        'group/browser-button relative grid size-8 shrink-0 place-items-center rounded-md outline-0 transition-colors before:absolute before:-inset-1 before:content-[""] focus-visible:text-ink disabled:pointer-events-none disabled:opacity-35',
        active ? 'text-ink' : 'text-soft',
        !disabled && !active && 'hover:text-ink active:text-ink'
      )}
    >
      <span class="pointer-events-none grid size-4 place-items-center">{children}</span>
    </button>
  );

  if (!tooltipLabel) return button;
  return (
    <Tooltip label={tooltipLabel} side={tooltipSide}>
      {button}
    </Tooltip>
  );
};
