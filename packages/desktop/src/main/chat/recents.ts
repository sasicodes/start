import { listSessionsByCwd, type SessionRecord } from '@main/sessions';
import type {
  AgentTabStatus,
  RecentSession,
  RecentSessionsOptions,
  RecentSessionsPage,
  SessionNotice
} from '@main/types';

type RecentSessionsRequest = RecentSessionsOptions & { workspacePath: string };

export type LiveRecentSession = RecentSession & { workspacePath: string };

const defaultRecentSessionLimit = 15;

const pageLimit = (options: RecentSessionsRequest) => Math.max(1, options.limit ?? defaultRecentSessionLimit);
const pageOffset = (options: RecentSessionsRequest) => Math.max(0, options.offset ?? 0);

const recentSession = (
  session: SessionRecord,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notice?: SessionNotice
): RecentSession => {
  const status = statuses.get(session.id);

  return {
    id: session.id,
    path: session.path,
    title: session.title,
    modified: session.updatedAt,
    ...(status ? { status } : {}),
    ...(notice ? { noticeKind: notice.kind } : {})
  };
};

const mergeLiveSessions = (
  sessions: RecentSession[],
  liveSessions: readonly LiveRecentSession[],
  options: RecentSessionsRequest,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notices: ReadonlyMap<string, SessionNotice>
) => {
  if (options.archived === true) return sessions;

  const merged = new Map(sessions.map((session) => [session.id, session]));
  for (const session of liveSessions) {
    if (session.workspacePath !== options.workspacePath) continue;

    const status = statuses.get(session.id) ?? session.status;
    const notice = notices.get(session.id);
    const persisted = merged.get(session.id);
    merged.set(session.id, {
      id: session.id,
      path: persisted?.path ?? session.path,
      title: persisted?.title ?? session.title,
      modified: Math.max(persisted?.modified ?? 0, session.modified),
      ...(status ? { status } : {}),
      ...(notice ? { noticeKind: notice.kind } : {})
    });
  }

  return [...merged.values()].sort((first, second) => second.modified - first.modified);
};

export const recentSessionsPage = async (
  options: RecentSessionsRequest,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notices: ReadonlyMap<string, SessionNotice>,
  liveSessions: readonly LiveRecentSession[] = []
): Promise<RecentSessionsPage> => {
  const limit = pageLimit(options);
  const offset = pageOffset(options);
  const lookahead = limit + offset + 1;
  const rows = listSessionsByCwd(options.workspacePath, {
    offset: 0,
    limit: lookahead,
    archived: options.archived === true
  });
  const sessions = rows.map((session) => recentSession(session, statuses, notices.get(session.id)));
  const mergedSessions = mergeLiveSessions(sessions, liveSessions, options, statuses, notices);
  const page = mergedSessions.slice(offset, offset + limit);

  return {
    hasMore: mergedSessions.length > offset + limit,
    sessions: page
  };
};
