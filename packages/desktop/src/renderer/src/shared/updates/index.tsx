import type { UpdateState } from '@preload/index';
import { useAppFocusState } from '@renderer/shared/app-focus';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { Tooltip } from '@renderer/ui/tooltip';
import { CycleVerticalIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';

export const Update = memo(() => {
  const appFocused = useAppFocusState();
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    let active = true;

    window.pi.app.updateState().then((nextState) => {
      if (active) setState(nextState);
    });

    const stopUpdateEvents = window.pi.app.onUpdateStateChanged(setState);
    return () => {
      active = false;
      stopUpdateEvents();
    };
  }, []);

  if (state.status !== 'available' && state.status !== 'downloaded' && state.status !== 'downloading') return null;

  const downloaded = state.status === 'downloaded';
  const label = downloaded ? 'Update and Restart' : 'Update';

  return (
    <Tooltip label={label}>
      <motion.button
        type="button"
        animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
        aria-label={label}
        disabled={!downloaded}
        initial={bottomBubbleHiddenMotion}
        onClick={() => void window.pi.app.installUpdate()}
        transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
        class={tw(
          'flex h-11.5 shrink-0 items-center gap-2 overflow-hidden rounded-full border-0 bg-composer px-5 text-xs leading-none font-semibold text-ink shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none focus-visible:bg-control @max-workspace-dock/chat:size-11.5 @max-workspace-dock/chat:justify-center @max-workspace-dock/chat:p-0',
          downloaded && 'hover:bg-control',
          (!appFocused || !downloaded) && 'pointer-events-none'
        )}
      >
        <CycleVerticalIcon class="size-5 flex-none text-success" strokeWidth={2} />
        <span class="max-w-36 truncate @max-workspace-dock/chat:hidden">{label}</span>
      </motion.button>
    </Tooltip>
  );
});
