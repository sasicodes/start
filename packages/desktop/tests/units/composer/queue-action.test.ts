import type { QueuedMessageKind } from '@preload/index';
import { queueAction } from '@renderer/shared/composer/queue/utils/action';
import { expect, it } from 'vitest';

it.each<QueuedMessageKind>(['goal', 'steer', 'followUp'])('disables delivery while editing a %s', (kind) => {
  expect(queueAction({ kind, editing: true, blocked: false, generating: true })).toMatchObject({
    text: 'Editing',
    disabled: true
  });
});

it.each([true, false])('never offers steering for a goal, blocked: %s', (blocked) => {
  expect(queueAction({ kind: 'goal', editing: false, blocked, generating: blocked })).toMatchObject({
    text: blocked ? 'Waiting' : 'Start',
    disabled: blocked,
    steer: false
  });
});

it('keeps ordinary messages available for sending and steering', () => {
  expect(queueAction({ kind: 'followUp', editing: false, blocked: true, generating: true })).toMatchObject({
    text: 'Steer',
    disabled: false,
    steer: true
  });
  expect(queueAction({ kind: 'steer', editing: false, blocked: true, generating: true })).toMatchObject({
    text: 'Steering',
    disabled: true
  });
  expect(queueAction({ kind: 'followUp', editing: false, blocked: true, generating: false })).toMatchObject({
    text: 'Send',
    disabled: false,
    steer: false
  });
});
