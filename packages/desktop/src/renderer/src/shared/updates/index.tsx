import type { UpdateState } from '@preload/index';
import { useAppFocusState } from '@renderer/shared/app-focus';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';

export const Update = memo(() => {
  const appFocused = useAppFocusState();
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    let active = true;

    window.pi.app
      .updateState()
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch(() => {});

    const stopUpdateEvents = window.pi.app.onUpdateStateChanged(setState);
    return () => {
      active = false;
      stopUpdateEvents();
    };
  }, []);

  if (state.status !== 'downloaded') return null;

  const label = 'Update and Restart';
  const installUpdate = () => {
    window.pi.app.installUpdate().catch(() => {});
  };

  return (
    <motion.button
      type="button"
      aria-label={label}
      initial={bottomBubbleHiddenMotion}
      onClick={installUpdate}
      animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
      transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
      class="flex h-11.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-composer px-5 text-xs leading-none font-semibold whitespace-nowrap text-ink shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control"
    >
      {label}
    </motion.button>
  );
});
