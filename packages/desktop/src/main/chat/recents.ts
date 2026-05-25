import { listSessionsByCwd, type SessionRecord } from '@main/sessions';
import type {
  AgentTabStatus,
  RecentSession,
  RecentSessionsOptions,
  RecentSessionsPage,
  SessionNotice
} from '@main/types';

type RecentSessionsRequest = RecentSessionsOptions & { workspacePath: string };

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

export const recentSessionsPage = async (
  options: RecentSessionsRequest,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notices: ReadonlyMap<string, SessionNotice>
): Promise<RecentSessionsPage> => {
  const limit = pageLimit(options);
  const offset = pageOffset(options);
  const lookahead = limit + 1;
  const rows = listSessionsByCwd(options.workspacePath, {
    limit: lookahead,
    offset,
    archived: options.archived === true
  });
  const page = rows.slice(0, limit);

  return {
    hasMore: rows.length > limit,
    sessions: page.map((session) => recentSession(session, statuses, notices.get(session.id)))
  };
};
