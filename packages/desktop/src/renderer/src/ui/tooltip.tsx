import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ComponentChildren, VNode } from 'preact';

export const TooltipProvider = ({ children }: { children: ComponentChildren }) => {
  return <BaseTooltip.Provider>{children}</BaseTooltip.Provider>;
};

export const Tooltip = ({
  label,
  children,
  disabled = false,
  side = 'top',
  align = 'center'
}: {
  label: ComponentChildren;
  children: VNode;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => {
  return (
    <BaseTooltip.Root disabled={disabled}>
      <BaseTooltip.Trigger delay={180} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          side={side}
          align={align}
          sideOffset={12}
          collisionPadding={12}
          className="tooltip-positioner z-50"
        >
          <BaseTooltip.Popup className="tooltip-popup pointer-events-none rounded-full border-0 bg-tooltip px-3 py-1.75 text-xs leading-none font-medium whitespace-nowrap text-zinc-950 opacity-100 shadow-sm transition-[opacity,transform] duration-100 ease-out select-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
};
