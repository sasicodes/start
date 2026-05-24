import { SessionManager } from '@earendil-works/pi-coding-agent';
import type { RecentSession, RecentSessionsOptions, RecentSessionsPage, SessionNotice } from '@main/types';

type ListedSession = Awaited<ReturnType<typeof SessionManager.list>>[number];
type RecentSessionsRequest = RecentSessionsOptions & { workspacePath: string };

const defaultRecentSessionLimit = 15;

const pageLimit = (limit: number | undefined) => Math.max(1, limit ?? defaultRecentSessionLimit);
const pageOffset = (offset: number | undefined) => Math.max(0, offset ?? 0);

const sortRecentSessions = (sessions: ListedSession[]) =>
  [...sessions].sort(
    (first, second) => second.modified.getTime() - first.modified.getTime() || second.id.localeCompare(first.id)
  );

const recentSession = (session: ListedSession, notice?: SessionNotice): RecentSession => ({
  id: session.id,
  path: session.path,
  title: session.name || session.firstMessage || 'Untitled session',
  modified: session.modified.getTime(),
  ...(notice ? { noticeKind: notice.kind } : {})
});

const recentSessionRecords = async (workspacePath: string): Promise<ListedSession[]> => {
  const sessions = await SessionManager.list(workspacePath);
  const uniqueSessions = new Map<string, ListedSession>();

  for (const session of sessions) uniqueSessions.set(session.id, session);

  return sortRecentSessions([...uniqueSessions.values()]);
};

export const recentSessionsPage = async (
  options: RecentSessionsRequest,
  notices: ReadonlyMap<string, SessionNotice>
): Promise<RecentSessionsPage> => {
  const sessions = await recentSessionRecords(options.workspacePath);
  const offset = pageOffset(options.offset);
  const limit = pageLimit(options.limit);
  const page = sessions.slice(offset, offset + limit);

  return {
    hasMore: offset + limit < sessions.length,
    sessions: page.map((session) => recentSession(session, notices.get(session.id)))
  };
};
