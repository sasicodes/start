import { signal } from '@preact/signals';
import type { UpdateState } from '@preload/index';
import { useEffect } from 'preact/hooks';

let updateStateRequestId = 0;
let updateStateSubscriberCount = 0;
let stopUpdateEvents: (() => void) | undefined;

const updateState = signal<UpdateState>({ status: 'idle' });

const applyUpdateState = (state: UpdateState) => {
  updateState.value = state;
};

const refreshUpdateState = (requestId: number) => {
  window.pi.app
    .updateState()
    .then((state) => {
      if (updateStateRequestId === requestId && updateStateSubscriberCount > 0) applyUpdateState(state);
    })
    .catch(() => {});
};

const subscribeUpdateState = () => {
  updateStateSubscriberCount += 1;

  if (updateStateSubscriberCount === 1) {
    const requestId = updateStateRequestId + 1;
    updateStateRequestId = requestId;

    refreshUpdateState(requestId);
    stopUpdateEvents = window.pi.app.onUpdateStateChanged(applyUpdateState);
  }

  return () => {
    updateStateSubscriberCount = Math.max(0, updateStateSubscriberCount - 1);
    if (updateStateSubscriberCount > 0) return;

    updateStateRequestId += 1;
    stopUpdateEvents?.();
    stopUpdateEvents = undefined;
  };
};

export const installUpdate = () => {
  window.pi.app.installUpdate().catch(() => {});
};

export const useUpdateState = () => {
  useEffect(() => subscribeUpdateState(), []);
  return updateState.value;
};
