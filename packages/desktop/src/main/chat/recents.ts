import { SessionManager } from '@earendil-works/pi-coding-agent';
import type {
  AgentTabStatus,
  RecentSession,
  RecentSessionsOptions,
  RecentSessionsPage,
  SessionNotice
} from '@main/types';

type ListedSession = Awaited<ReturnType<typeof SessionManager.list>>[number];
type RecentSessionsRequest = RecentSessionsOptions & { workspacePath: string };

const defaultRecentSessionLimit = 15;

const pageLimit = (options: RecentSessionsRequest) => Math.max(1, options.limit ?? defaultRecentSessionLimit);
const pageOffset = (options: RecentSessionsRequest) => Math.max(0, options.offset ?? 0);

const sortRecentSessions = (sessions: ListedSession[]) =>
  [...sessions].sort(
    (first, second) => second.modified.getTime() - first.modified.getTime() || second.id.localeCompare(first.id)
  );

const recentSession = (
  session: ListedSession,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notice?: SessionNotice
): RecentSession => {
  const status = statuses.get(session.id);

  return {
    id: session.id,
    path: session.path,
    title: session.name || session.firstMessage || 'Untitled session',
    modified: session.modified.getTime(),
    ...(status ? { status } : {}),
    ...(notice ? { noticeKind: notice.kind } : {})
  };
};

const recentSessionRecords = async (workspacePath: string): Promise<ListedSession[]> => {
  const sessions = await SessionManager.list(workspacePath);
  const uniqueSessions = new Map<string, ListedSession>();

  for (const session of sessions) uniqueSessions.set(session.id, session);

  return sortRecentSessions([...uniqueSessions.values()]);
};

export const recentSessionsPage = async (
  options: RecentSessionsRequest,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notices: ReadonlyMap<string, SessionNotice>
): Promise<RecentSessionsPage> => {
  const sessions = await recentSessionRecords(options.workspacePath);
  const offset = pageOffset(options);
  const limit = pageLimit(options);
  const page = sessions.slice(offset, offset + limit);

  return {
    hasMore: offset + limit < sessions.length,
    sessions: page.map((session) => recentSession(session, statuses, notices.get(session.id)))
  };
};
