import { listSessionsByCwds, type SessionRecord } from '@main/sessions';
import type {
  AgentTabStatus,
  RecentSession,
  RecentSessionsOptions,
  RecentSessionsPage,
  SessionNotice
} from '@main/types';
import { worktreeBranchLabel } from '@main/workspace/worktree';

export interface WorktreeRef {
  path: string;
  branch: string;
}

type RecentSessionsRequest = RecentSessionsOptions & { workspacePath: string; worktrees?: WorktreeRef[] };

export type LiveRecentSession = RecentSession & { workspacePath: string };

const defaultRecentSessionLimit = 15;

export const liveSessionModified = (status: RecentSession['status'], now: number, lastActive?: number): number =>
  status === 'generating' || lastActive === undefined ? now : lastActive;

const pageLimit = (options: RecentSessionsRequest) => Math.max(1, options.limit ?? defaultRecentSessionLimit);
const pageOffset = (options: RecentSessionsRequest) => Math.max(0, options.offset ?? 0);

const recentSession = (
  session: SessionRecord,
  statuses: ReadonlyMap<string, AgentTabStatus>,
  notice?: SessionNotice,
  branch?: string
): RecentSession => {
  const status = statuses.get(session.id);

  return {
    id: session.id,
    path: session.path,
    title: session.title,
    modified: session.updatedAt,
    ...(branch ? { branch: worktreeBranchLabel(branch) } : {}),
    ...(status ? { status } : {}),
    ...(notice ? { noticeKind: notice.kind } : {})
  };
};

const mergeLiveSessions = (
  sessions: RecentSession[],
  liveSessions: readonly LiveRecentSession[],
  options: RecentSessionsRequest,
  cwds: ReadonlySet<string>,
  branchByCwd: ReadonlyMap<string, string>
) => {
  if (options.archived === true) return sessions;

  const merged = new Map(sessions.map((session) => [session.id, session]));
  for (const live of liveSessions) {
    if (!cwds.has(live.workspacePath) || !live.modified) continue;

    const persisted = merged.get(live.id);
    const liveBranch = branchByCwd.get(live.workspacePath);
    const branch = persisted?.branch ?? (liveBranch ? worktreeBranchLabel(liveBranch) : '');
    merged.set(live.id, {
      id: live.id,
      path: persisted?.path ?? live.path,
      title: persisted?.title ?? live.title,
      modified: Math.max(persisted?.modified ?? 0, live.modified),
      ...(branch ? { branch } : {}),
      ...(live.status ? { status: live.status } : {}),
      ...(live.noticeKind ? { noticeKind: live.noticeKind } : {})
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
  const worktrees = options.worktrees ?? [];
  const branchByCwd = new Map(worktrees.map((tree) => [tree.path, tree.branch]));
  const cwds = [options.workspacePath, ...worktrees.map((tree) => tree.path)];
  const rows = listSessionsByCwds(cwds, {
    offset: 0,
    limit: lookahead,
    archived: options.archived === true
  });
  const sessions = rows.map((session) =>
    recentSession(session, statuses, notices.get(session.id), branchByCwd.get(session.cwd))
  );
  const mergedSessions = mergeLiveSessions(sessions, liveSessions, options, new Set(cwds), branchByCwd);
  const page = mergedSessions.slice(offset, offset + limit);

  return {
    hasMore: mergedSessions.length > offset + limit,
    sessions: page
  };
};
