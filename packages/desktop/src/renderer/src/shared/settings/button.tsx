import { useAppFocusState } from '@renderer/shared/app-focus';
import { SettingsIcon } from '@renderer/ui/icons';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';

interface SettingsButtonProps {
  active: boolean;
  onOpenSettings: () => void;
}

export const SettingsButton = memo(({ active, onOpenSettings }: SettingsButtonProps) => {
  const appFocused = useAppFocusState();

  return (
    <motion.button
      type="button"
      animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
      aria-expanded={active}
      aria-label="Open settings"
      initial={false}
      onClick={onOpenSettings}
      transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
      class={tw(
        'grid size-11.5 shrink-0 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors duration-75 ease-out select-none hover:bg-control focus-visible:bg-control',
        !appFocused && 'pointer-events-none'
      )}
    >
      <SettingsIcon class="size-5" />
    </motion.button>
  );
});
