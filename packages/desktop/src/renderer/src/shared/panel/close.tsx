import { SidebarCloseIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';

type PanelCloseButtonVariant = 'compact' | 'toolbar';

interface PanelCloseButtonProps {
  onClick: () => void;
  variant?: PanelCloseButtonVariant;
}

export const PanelCloseButton = ({ onClick, variant = 'compact' }: PanelCloseButtonProps) => (
  <button
    type="button"
    aria-label="Close sidebar"
    onClick={onClick}
    class={tw(
      variant === 'toolbar'
        ? "relative grid size-8 flex-none place-items-center rounded-md border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-1 before:content-[''] hover:text-ink active:text-ink focus-visible:text-ink [&_svg]:block [&_svg]:size-4"
        : "relative inline-flex size-4 flex-none items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] hover:text-hover focus-visible:text-hover [&_svg]:block [&_svg]:size-4"
    )}
  >
    <SidebarCloseIcon strokeWidth={1.5} />
  </button>
);
