import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface ActivityTriggerProps {
  open: boolean;
  onOpen: () => void;
  children: ComponentChildren;
}

export const ActivityTrigger = ({ open, onOpen, children }: ActivityTriggerProps) => (
  <button
    type="button"
    onClick={onOpen}
    aria-expanded={open}
    class={tw(
      'inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 text-left text-xs text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover',
      open && 'text-hover'
    )}
  >
    {children}
  </button>
);
