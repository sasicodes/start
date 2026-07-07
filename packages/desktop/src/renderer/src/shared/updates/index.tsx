import { RELEASE_NOTES_URL } from '@renderer/constants';
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
import { tw } from '@renderer/utils/tw';
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
  const showReleaseNotes = !downloaded;

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
          class={tw(
            'flex h-full shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent text-sm leading-5 font-medium whitespace-nowrap text-ink outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control disabled:bg-muted disabled:text-soft',
            showReleaseNotes ? 'rounded-l-full py-0 pr-3 pl-5' : 'rounded-full px-5'
          )}
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
            {state.status === 'downloading' ? (
              <>
                Downloading (<span class="inline-block w-9 text-center">{state.percent}%</span>)
              </>
            ) : (
              label
            )}
          </span>
        </button>
      </Tooltip>
      {showReleaseNotes && (
        <>
          <span aria-hidden="true" class="h-full w-0.5 shrink-0 bg-line" />
          <Tooltip label="Release notes">
            <a
              href={RELEASE_NOTES_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Release notes"
              class="flex h-full shrink-0 items-center rounded-r-full py-0 pr-4 pl-3 text-ink transition-colors duration-75 ease-out hover:bg-control focus-visible:bg-control"
            >
              <NoteTextIcon class="size-5" />
            </a>
          </Tooltip>
        </>
      )}
    </motion.div>
  );
});
