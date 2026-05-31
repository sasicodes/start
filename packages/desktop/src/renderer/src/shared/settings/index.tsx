import { useAppFocusState } from '@renderer/shared/app-focus';
import { SettingsIcon } from '@renderer/ui/icons';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';

interface SettingsProps {
  open: boolean;
  onOpen: () => void;
}

export const Settings = memo(({ open, onOpen }: SettingsProps) => {
  const appFocused = useAppFocusState();

  return (
    <Tooltip label="Settings" disabled={open || !appFocused}>
      <motion.button
        type="button"
        animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
        aria-expanded={open}
        aria-label="Open settings"
        initial={false}
        onClick={onOpen}
        transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
        class={tw(
          'grid size-11.5 shrink-0 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors duration-75 ease-out select-none hover:bg-control focus-visible:bg-control',
          !appFocused && 'pointer-events-none'
        )}
      >
        <SettingsIcon class="size-5" />
      </motion.button>
    </Tooltip>
  );
});
