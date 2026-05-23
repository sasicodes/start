import { Tooltip } from '@base-ui/react/tooltip';
import type { ComponentChildren } from 'preact';

export const TooltipProvider = ({ children }: { children: ComponentChildren }) => {
  return <Tooltip.Provider>{children}</Tooltip.Provider>;
};

export const CommonTooltip = ({
  label,
  children,
  disabled = false,
  side = 'top',
  align = 'center',
  sideOffset = 12
}: {
  sideOffset?: number;
  label: ComponentChildren;
  children: ComponentChildren;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => {
  return (
    <Tooltip.Root disabled={disabled}>
      <Tooltip.Trigger delay={180} render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={12}
          className="tooltip-positioner z-50"
        >
          <Tooltip.Popup className="tooltip-popup pointer-events-none rounded-full border-0 bg-tooltip px-3 py-1.75 text-xs leading-none font-medium whitespace-nowrap text-zinc-950 opacity-100 shadow-sm transition-[opacity,transform] duration-100 ease-out select-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
