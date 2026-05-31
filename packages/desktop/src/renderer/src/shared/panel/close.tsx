import { SidebarCloseIcon } from '@renderer/ui/icons';

interface PanelCloseButtonProps {
  onClick: () => void;
}

export const PanelCloseButton = ({ onClick }: PanelCloseButtonProps) => (
  <button
    type="button"
    aria-label="Close sidebar"
    title="Close sidebar"
    onClick={onClick}
    class="relative inline-flex size-4 flex-none items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] hover:text-hover focus-visible:text-hover [&_svg]:block [&_svg]:size-4"
  >
    <SidebarCloseIcon strokeWidth={1.5} />
  </button>
);
