import { animationActive } from '@renderer/shared/animation';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { downloadUpdate, installUpdate, updateLabel, useUpdateState } from '@renderer/shared/updates/state';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { Tooltip } from '@renderer/ui/tooltip';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';

const updateTooltip = (downloading: boolean, downloaded: boolean) => {
  if (downloading) return 'Downloading';
  if (downloaded) return 'Restart to update';
  return 'Update available';
};

export const Update = memo(() => {
  const state = useUpdateState();
  const appFocused = useAppFocusState();
  const status = state.status;

  if (status !== 'available' && status !== 'downloaded' && status !== 'downloading') return null;

  const downloading = status === 'downloading';
  const downloaded = status === 'downloaded';
  const active = animationActive(appFocused) && !downloading;
  const label = updateLabel(state);

  return (
    <Tooltip label={updateTooltip(downloading, downloaded)}>
      <motion.button
        type="button"
        aria-label={label}
        disabled={downloading}
        initial={bottomBubbleHiddenMotion}
        onClick={downloaded ? installUpdate : downloadUpdate}
        animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
        transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
        class="flex h-11.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-composer px-5 text-sm leading-5 font-medium whitespace-nowrap text-ink shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control disabled:bg-muted disabled:text-soft"
      >
        <span class="relative inline-block max-w-full truncate leading-5">
          {active && (
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 animate-[activity-text-shimmer_2.4s_linear_infinite] bg-[image:var(--shimmer-gradient-brand)] [background-size:240%_100%] bg-clip-text text-transparent [-webkit-background-clip:text] motion-reduce:hidden"
            >
              {label}
            </span>
          )}
          {label}
        </span>
      </motion.button>
    </Tooltip>
  );
});
