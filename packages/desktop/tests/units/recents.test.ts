import type { SessionRecord } from '@main/sessions';
import type { AgentTabStatus } from '@main/types';
import { describe, expect, it, vi } from 'vitest';

const persistedSessions: SessionRecord[] = [];

vi.mock('@main/sessions', () => ({
  listSessionsByCwd: () => persistedSessions
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
});
