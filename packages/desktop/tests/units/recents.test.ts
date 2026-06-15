import type { SessionRecord } from '@main/sessions';
import type { AgentTabStatus } from '@main/types';
import { describe, expect, it, vi } from 'vitest';

const persistedSessions: SessionRecord[] = [];

vi.mock('@main/sessions', () => ({
  listSessionsByCwds: () => persistedSessions
}));

const sessionRecord = (id: string, updatedAt: number): SessionRecord => ({
  id,
  updatedAt,
  archived: false,
  createdAt: updatedAt,
  cwd: '/workspace',
  path: `${id}.json`,
  title: `Persisted ${id}`,
  totalInputTokens: 0,
  totalOutputTokens: 0
});

describe('live session modified', () => {
  it('uses the current time for a generating session', async () => {
    const { liveSessionModified } = await import('@main/chat/recents');
    expect(liveSessionModified('generating', 500, 100)).toBe(500);
  });

  it('uses the persisted last-active time for an idle session', async () => {
    const { liveSessionModified } = await import('@main/chat/recents');
    expect(liveSessionModified('idle', 500, 100)).toBe(100);
  });

  it('falls back to the current time when the session is not yet persisted', async () => {
    const { liveSessionModified } = await import('@main/chat/recents');
    expect(liveSessionModified('idle', 500)).toBe(500);
  });
});

describe('recent sessions page', () => {
  it('includes live unpersisted sessions for the current workspace', async () => {
    persistedSessions.splice(0, persistedSessions.length, sessionRecord('persisted', 100));
    const { recentSessionsPage } = await import('@main/chat/recents');

    const page = await recentSessionsPage(
      { workspacePath: '/workspace', limit: 10 },
      new Map<string, AgentTabStatus>([['live', 'generating']]),
      new Map(),
      [
        {
          id: 'live',
          path: 'live.json',
          title: 'Live prompt',
          status: 'generating',
          modified: 200,
          workspacePath: '/workspace'
        }
      ]
    );

    expect(page.sessions.map((session) => session.id)).toEqual(['live', 'persisted']);
    expect(page.sessions[0]?.status).toBe('generating');
  });

  it('keeps live sessions out of other workspaces and archived pages', async () => {
    persistedSessions.splice(0, persistedSessions.length, sessionRecord('persisted', 100));
    const { recentSessionsPage } = await import('@main/chat/recents');

    const liveSession = {
      id: 'live',
      path: 'live.json',
      title: 'Live prompt',
      status: 'generating' as const,
      modified: 200,
      workspacePath: '/other'
    };

    const page = await recentSessionsPage({ workspacePath: '/workspace', limit: 10 }, new Map(), new Map(), [
      liveSession
    ]);
    const archivedPage = await recentSessionsPage(
      { workspacePath: '/workspace', archived: true, limit: 10 },
      new Map(),
      new Map(),
      [{ ...liveSession, workspacePath: '/workspace' }]
    );

    expect(page.sessions.map((session) => session.id)).toEqual(['persisted']);
    expect(archivedPage.sessions.map((session) => session.id)).toEqual(['persisted']);
  });

  it('keeps idle open sessions at their persisted recency instead of pinning them', async () => {
    persistedSessions.splice(0, persistedSessions.length, sessionRecord('newer', 300), sessionRecord('idle-open', 100));
    const { recentSessionsPage } = await import('@main/chat/recents');

    const page = await recentSessionsPage(
      { workspacePath: '/workspace', limit: 10 },
      new Map<string, AgentTabStatus>([['idle-open', 'idle']]),
      new Map(),
      [
        {
          id: 'idle-open',
          path: 'idle.json',
          title: 'Idle open session',
          status: 'idle',
          modified: 0,
          workspacePath: '/workspace'
        }
      ]
    );

    expect(page.sessions.map((session) => session.id)).toEqual(['newer', 'idle-open']);
    expect(page.sessions[1]?.modified).toBe(100);
  });

  it('includes worktree sessions under the repo and labels them with the branch', async () => {
    persistedSessions.splice(0, persistedSessions.length, sessionRecord('repo', 200), {
      ...sessionRecord('worktree', 150),
      cwd: '/workspace/.worktrees/a'
    });
    const { recentSessionsPage } = await import('@main/chat/recents');

    const page = await recentSessionsPage(
      {
        limit: 10,
        workspacePath: '/workspace',
        worktrees: [{ path: '/workspace/.worktrees/a', branch: 'start/fix-bug-1a2b3c4d' }]
      },
      new Map(),
      new Map(),
      []
    );

    expect(page.sessions.map((session) => session.id)).toEqual(['repo', 'worktree']);
    expect(page.sessions.find((session) => session.id === 'repo')?.branch).toBeUndefined();
    expect(page.sessions.find((session) => session.id === 'worktree')?.branch).toBe('fix-bug-1a2b3c4d');
  });

  it('does not resurface idle archived sessions that are still loaded in memory', async () => {
    persistedSessions.splice(0, persistedSessions.length, sessionRecord('persisted', 100));
    const { recentSessionsPage } = await import('@main/chat/recents');

    const page = await recentSessionsPage({ workspacePath: '/workspace', limit: 10 }, new Map(), new Map(), [
      {
        id: 'archived-live',
        path: 'archived.json',
        title: 'Archived session',
        status: 'idle',
        modified: 0,
        workspacePath: '/workspace'
      }
    ]);

    expect(page.sessions.map((session) => session.id)).toEqual(['persisted']);
  });
});
