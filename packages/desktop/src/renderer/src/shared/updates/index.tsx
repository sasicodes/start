import { useAppFocusState } from '@renderer/shared/app-focus';
import { installUpdate, useUpdateState } from '@renderer/shared/updates/state';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';

export const Update = memo(() => {
  const appFocused = useAppFocusState();
  const state = useUpdateState();

  if (state.status !== 'downloaded') return null;

  return (
    <motion.button
      type="button"
      aria-label="Update"
      initial={bottomBubbleHiddenMotion}
      onClick={installUpdate}
      animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
      transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
      class="flex h-11.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-composer px-5 text-xs leading-none font-semibold whitespace-nowrap text-ink shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control"
    >
      Update
    </motion.button>
  );
});
