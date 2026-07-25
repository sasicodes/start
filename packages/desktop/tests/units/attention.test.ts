import type { WorkspaceFolder } from '@preload/index';
import {
  attentionCountLabel,
  attentionLabel,
  attentionStatusCount,
  sessionAttentionStatus,
  workspaceFoldersAttention
} from '@renderer/shared/attention';

const folder = (path: string, status?: WorkspaceFolder['status'], active = false): WorkspaceFolder => ({
  path,
  active,
  name: path,
  modified: 0,
  sessionCount: 0,
  ...(status ? { status } : {})
});

describe('attention status', () => {
  it('shows generating status for the active session', () => {
    expect(sessionAttentionStatus('session-a', 'session-a', 'generating')).toBe('generating');
  });

  it('hides terminal status for the active session', () => {
    expect(sessionAttentionStatus('session-a', 'session-a', 'completed')).toBe('');
    expect(sessionAttentionStatus('session-a', 'session-a', 'failed')).toBe('');
    expect(sessionAttentionStatus('session-a', 'session-a', undefined, 'completed')).toBe('');
    expect(sessionAttentionStatus('session-a', 'session-a', undefined, 'failed')).toBe('');
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

  it('counts active attention statuses', () => {
    expect(attentionStatusCount(['', 'completed', 'failed', 'generating'])).toBe(3);
  });

  it('formats attention count labels', () => {
    expect(attentionCountLabel(3)).toBe('3');
    expect(attentionCountLabel(100)).toBe('99+');
  });

  it('summarizes workspace attention including active generation', () => {
    const folders = [
      folder('/active', 'generating', true),
      folder('/other', 'completed'),
      folder('/failing', 'failed'),
      folder('/idle')
    ];

    expect(workspaceFoldersAttention(folders)).toEqual({ kind: 'failed', countLabel: '3' });
  });

  it('reports attention when the active workspace is generating', () => {
    expect(workspaceFoldersAttention([folder('/active', 'generating', true)])).toEqual({
      kind: 'generating',
      countLabel: '1'
    });
  });

  it('hides failure when the active workspace failed', () => {
    expect(workspaceFoldersAttention([folder('/active', 'failed', true)])).toEqual({
      kind: '',
      countLabel: '0'
    });
  });

  it('hides active completion from cumulative workspace attention', () => {
    const folders = [folder('/active', 'completed', true), folder('/other', 'generating')];

    expect(workspaceFoldersAttention(folders)).toEqual({
      kind: 'generating',
      countLabel: '1'
    });
  });

  it('includes the active repository generation for a worktree session', () => {
    const folders = [folder('/repo', 'generating', true), folder('/other', 'completed')];

    expect(workspaceFoldersAttention(folders)).toEqual({
      kind: 'generating',
      countLabel: '2'
    });
  });
});
