import { animationActive } from '@renderer/shared/animation';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { downloadUpdate, installUpdate, updateLabel, useUpdateState } from '@renderer/shared/updates/state';
import { NoteTextIcon } from '@renderer/ui/icons';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { Tooltip } from '@renderer/ui/tooltip';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';

const releaseNotesUrl = 'https://github.com/sasicodes/start/releases';

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
    <motion.div
      initial={bottomBubbleHiddenMotion}
      animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
      transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
      class="flex h-11.5 shrink-0 items-center overflow-hidden rounded-full bg-composer shadow-shell"
    >
      <Tooltip label={updateTooltip(downloading, downloaded)}>
        <button
          type="button"
          aria-label={label}
          disabled={downloading}
          onClick={downloaded ? installUpdate : downloadUpdate}
          class="flex h-full shrink-0 items-center justify-center overflow-hidden rounded-l-full border-0 bg-transparent px-5 text-sm leading-5 font-medium whitespace-nowrap text-ink outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control disabled:bg-muted disabled:text-soft"
        >
          <span class="relative inline-block max-w-full truncate leading-5 tabular-nums">
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
        </button>
      </Tooltip>
      <span aria-hidden="true" class="h-full w-0.5 shrink-0 bg-line" />
      <Tooltip label="Release notes">
        <a
          href={releaseNotesUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Release notes"
          class="grid h-full w-8 shrink-0 place-items-center rounded-r-full text-ink transition-colors duration-75 ease-out hover:bg-control focus-visible:bg-control"
        >
          <NoteTextIcon class="size-3.5" />
        </a>
      </Tooltip>
    </motion.div>
  );
});
