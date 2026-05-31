import { attentionLabel, sessionAttentionStatus } from '@renderer/shared/attention-status';

describe('attention status', () => {
  it('hides status for the active session', () => {
    expect(sessionAttentionStatus('session-a', 'session-a', 'generating')).toBe('');
    expect(sessionAttentionStatus('session-a', 'session-a', undefined, 'completed')).toBe('');
  });

  it('keeps status for inactive sessions', () => {
    expect(sessionAttentionStatus('session-a', 'session-b', 'generating')).toBe('generating');
    expect(sessionAttentionStatus('session-a', 'session-b', undefined, 'completed')).toBe('completed');
  });

  it('labels generating as in progress', () => {
    expect(attentionLabel('generating')).toBe('in progress');
    expect(attentionLabel('completed')).toBe('completed');
    expect(attentionLabel('failed')).toBe('failed');
  });
});
