import { useAppFocusState } from '@renderer/shared/app-focus';
import { installUpdate, useUpdateState } from '@renderer/shared/updates/state';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { Tooltip } from '@renderer/ui/tooltip';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';

export const Update = memo(() => {
  const state = useUpdateState();
  const appFocused = useAppFocusState();

  if (state.status !== 'downloaded') return null;

  return (
    <Tooltip label="Restart to update">
      <motion.button
        type="button"
        aria-label="Update"
        onClick={installUpdate}
        initial={bottomBubbleHiddenMotion}
        animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
        transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
        class="flex h-11.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-composer px-5 text-sm leading-5 font-medium whitespace-nowrap text-ink shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control"
      >
        <span class="relative inline-block max-w-full truncate leading-5 text-ink">
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,var(--color-soft)_0_42%,oklch(48%_0.16_35_/_0.92)_49%,oklch(70%_0.19_35_/_0.72)_52%,var(--color-soft)_59%_100%)] [background-size:240%_100%] bg-clip-text text-transparent [-webkit-background-clip:text] animate-[activity-text-shimmer_1.8s_linear_infinite] motion-reduce:hidden"
          >
            Update
          </span>
          Update
        </span>
      </motion.button>
    </Tooltip>
  );
});
