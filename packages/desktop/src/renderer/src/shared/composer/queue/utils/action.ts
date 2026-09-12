import type { QueuedMessageKind } from '@preload/index';

interface QueueActionInput {
  editing: boolean;
  blocked: boolean;
  generating: boolean;
  kind: QueuedMessageKind;
}

export const queueAction = ({ kind, editing, blocked, generating }: QueueActionInput) => {
  if (editing) return { text: 'Editing', label: 'Finish editing before sending', disabled: true, steer: false };
  if (kind === 'goal') {
    return {
      steer: false,
      disabled: blocked,
      text: blocked ? 'Waiting' : 'Start',
      label: blocked ? 'Goal waits for earlier work' : 'Start queued goal'
    };
  }
  if (!generating) return { text: 'Send', label: 'Send this queued message now', disabled: false, steer: false };
  if (kind === 'steer') return { text: 'Steering', label: 'Already steering next', disabled: true, steer: true };
  return { text: 'Steer', label: 'Steer this queued message', disabled: false, steer: true };
};
