import { effect, signal } from '@preact/signals';
import type { AppFocusState } from '@preload/index';
import { useEffect, useRef } from 'preact/hooks';

type AppFocusListener = (focused: boolean) => void;

let appFocusRequestId = 0;
let appFocusSubscriberCount = 0;
let appFocusDisposer: (() => void) | null = null;

export const appFocusState = signal(true);

const applyAppFocusState = (state: AppFocusState) => {
  appFocusState.value = state.focused;
};

const subscribeAppFocusState = () => {
  appFocusSubscriberCount += 1;

  if (appFocusSubscriberCount === 1) {
    const requestId = appFocusRequestId + 1;
    appFocusRequestId = requestId;

    void window.pi.app
      .focusState()
      .then((state) => {
        if (appFocusRequestId === requestId && appFocusSubscriberCount > 0) applyAppFocusState(state);
      })
      .catch(() => {});

    appFocusDisposer = window.pi.app.onFocusStateChanged(applyAppFocusState);
  }

  return () => {
    appFocusSubscriberCount = Math.max(0, appFocusSubscriberCount - 1);
    if (appFocusSubscriberCount > 0) return;

    appFocusRequestId += 1;
    appFocusDisposer?.();
    appFocusDisposer = null;
  };
};

export const useAppFocusSubscription = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    return subscribeAppFocusState();
  }, [enabled]);
};

export const useAppFocusState = (enabled = true) => {
  useAppFocusSubscription(enabled);
  return enabled ? appFocusState.value : false;
};

export const useAppFocusChange = (listener: AppFocusListener, enabled = true) => {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useAppFocusSubscription(enabled);

  useEffect(() => {
    if (!enabled) return;

    let initialized = false;
    return effect(() => {
      const focused = appFocusState.value;
      if (!initialized) {
        initialized = true;
        return;
      }

      listenerRef.current(focused);
    });
  }, [enabled]);
};
