import type { RecentSession, RecentSessionsChanged } from '@preload/index';
import {
  type AttentionState,
  attentionCountLabel,
  attentionStatusCount,
  sessionAttentionStatus,
  topAttentionStatus
} from '@renderer/shared/attention-status';
import { AttentionBadge } from '@renderer/shared/badge';
import { Indicator } from '@renderer/shared/indicator';
import { appHotkeys, useAppHotkey } from '@renderer/ui/hotkeys';
import { HistoryIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { Tooltip } from '@renderer/ui/tooltip';
import { formatRelativeTime } from '@renderer/utils/time';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const sessionPageSize = 15;
const sessionPrefetchDistance = 220;

const pageOptions = (workspacePath: string, limit: number, offset = 0) => ({
  limit,
  offset,
  ...(workspacePath ? { workspacePath } : {})
});

const sessionAttention = (session: RecentSession, activeSessionId: string): AttentionState =>
  sessionAttentionStatus(session.id, activeSessionId, session.status, session.noticeKind);

const recentSessionsAttentionStatuses = (sessions: RecentSession[], activeSessionId: string) =>
  sessions.map((session) => sessionAttention(session, activeSessionId));

const acknowledgeSession = (session: RecentSession): RecentSession => {
  const { noticeKind, status, ...rest } = session;
  if (status && status !== 'completed' && status !== 'failed') return { ...rest, status };
  return rest;
};

const acknowledgeSessionById = (sessions: RecentSession[], sessionId: string) =>
  sessions.map((session) => (session.id === sessionId ? acknowledgeSession(session) : session));

interface SessionRowProps {
  active: boolean;
  session: RecentSession;
  attention: AttentionState;
  onOpen: (session: RecentSession) => void;
}

interface SessionRowsProps {
  activeSessionId: string;
  sessions: RecentSession[];
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

interface RecentSessionsProps {
  isGenerating: boolean;
  workspacePath: string;
  activeSessionId: string;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

const SessionAttention = ({ attention }: { attention: AttentionState }) => {
  if (!attention) return null;
  return (
    <span class="flex items-center">
      <Indicator kind={attention} />
    </span>
  );
};

const SessionRow = ({ active, attention, session, onOpen }: SessionRowProps) => (
  <AppMenu.Item
    onClick={() => onOpen(session)}
    className={tw(
      'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
      active && 'bg-control text-hover'
    )}
  >
    <span class="col-span-2 truncate text-sm leading-5 font-medium">{session.title}</span>
    <span class="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-soft">
      <span class="flex-none">{formatRelativeTime(session.modified)}</span>
      {session.branch && <span class="truncate font-mono">[{session.branch}]</span>}
    </span>
    <SessionAttention attention={attention} />
  </AppMenu.Item>
);

const SessionRows = ({ sessions, activeSessionId, onOpenSession }: SessionRowsProps) =>
  sessions.map((session) => {
    const attention = sessionAttention(session, activeSessionId);
    return (
      <SessionRow
        key={session.id}
        active={session.id === activeSessionId}
        session={session}
        attention={attention}
        onOpen={(session) => void onOpenSession(session)}
      />
    );
  });

export const RecentSessions = memo(
  ({ isGenerating, workspacePath, activeSessionId, onOpenSession }: RecentSessionsProps) => {
    const mountedRef = useRef(true);
    const loadedCountRef = useRef(0);
    const loadingMoreRef = useRef(false);
    const sessionsRequestRef = useRef(0);
    const [open, setOpen] = useState(false);
    const wasGeneratingRef = useRef(isGenerating);
    const [knownEmpty, setKnownEmpty] = useState(false);
    const [sessions, setSessions] = useState<RecentSession[]>([]);
    const [hasMoreSessions, setHasMoreSessions] = useState(false);

    const loadSessions = useCallback(
      async (limit = sessionPageSize) => {
        const requestId = sessionsRequestRef.current + 1;
        sessionsRequestRef.current = requestId;

        try {
          const page = await window.pi.chat.recentSessionsPage(pageOptions(workspacePath, limit));
          if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;

          loadedCountRef.current = page.sessions.length;
          setSessions(page.sessions);
          setHasMoreSessions(page.hasMore);
          setKnownEmpty(page.sessions.length === 0);
        } catch {
          if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;

          loadedCountRef.current = 0;
          setSessions([]);
          setHasMoreSessions(false);
          setKnownEmpty(false);
        }
      },
      [workspacePath]
    );

    const loadMoreSessions = useCallback(async () => {
      if (!hasMoreSessions || loadingMoreRef.current) return;

      loadingMoreRef.current = true;
      const requestId = sessionsRequestRef.current;
      const offset = sessions.length;

      try {
        const page = await window.pi.chat.recentSessionsPage(pageOptions(workspacePath, sessionPageSize, offset));
        if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;

        setSessions((current) => {
          const nextSessions = [...current, ...page.sessions];
          loadedCountRef.current = nextSessions.length;
          return nextSessions;
        });
        setHasMoreSessions(page.hasMore);
      } catch {
      } finally {
        loadingMoreRef.current = false;
      }
    }, [workspacePath, sessions.length, hasMoreSessions]);

    const updateOpen = useCallback(
      (nextOpen: boolean) => {
        if (nextOpen) void loadSessions(Math.max(sessionPageSize, loadedCountRef.current));
        setOpen(nextOpen);
      },
      [loadSessions]
    );

    const handleSessionsScroll = useCallback(
      (event: Event) => {
        if (!hasMoreSessions) return;

        const element = event.currentTarget;
        if (!(element instanceof HTMLElement)) return;
        if (element.scrollHeight - element.scrollTop - element.clientHeight > sessionPrefetchDistance) return;

        void loadMoreSessions();
      },
      [hasMoreSessions, loadMoreSessions]
    );

    const openSession = useCallback(
      async (session: RecentSession) => {
        const opened = await onOpenSession(session);
        if (opened) {
          setSessions((current) => acknowledgeSessionById(current, session.id));
        }
        return opened;
      },
      [onOpenSession]
    );

    useAppHotkey(appHotkeys.recents, () => updateOpen(!open), { capture: true });

    const attentionStatuses = recentSessionsAttentionStatuses(sessions, activeSessionId);
    const attention = topAttentionStatus(attentionStatuses);
    const visibleAttentionCount = attentionStatusCount(attentionStatuses);
    const visibleAttentionCountLabel = attentionCountLabel(visibleAttentionCount);

    useEffect(() => {
      return () => {
        mountedRef.current = false;
        sessionsRequestRef.current += 1;
      };
    }, []);

    useEffect(() => {
      void loadSessions();
    }, [loadSessions]);

    useEffect(() => {
      const wasGenerating = wasGeneratingRef.current;
      wasGeneratingRef.current = isGenerating;
      if (wasGenerating && !isGenerating) void loadSessions(Math.max(sessionPageSize, loadedCountRef.current));
    }, [isGenerating, loadSessions]);

    useEffect(() => {
      const refreshOnChange = (event: RecentSessionsChanged) => {
        if (workspacePath && event.workspacePath && event.workspacePath !== workspacePath) return;
        void loadSessions(Math.max(sessionPageSize, loadedCountRef.current));
      };

      return window.pi.chat.onRecentSessionsChanged(refreshOnChange);
    }, [loadSessions, workspacePath]);

    useEffect(() => {
      return window.pi.chat.onStatusChanged(() => void loadSessions(Math.max(sessionPageSize, loadedCountRef.current)));
    }, [loadSessions]);

    if (knownEmpty && sessions.length === 0) return null;

    return (
      <AppMenu.Root open={open} modal={false} onOpenChange={updateOpen}>
        <Tooltip label="Recents" shortcut="R" disabled={open}>
          <div class="block size-11.5 rounded-full">
            <AppMenu.Trigger
              aria-label="Recent sessions"
              className="relative grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control"
            >
              <HistoryIcon class="size-5" />
              <AttentionBadge kind={attention} countLabel={visibleAttentionCountLabel} />
            </AppMenu.Trigger>
          </div>
        </Tooltip>
        <AppMenu.Portal>
          <AppMenu.Positioner side="top" sideOffset={12} className="z-50" collisionPadding={12}>
            <MenuPanel className="w-90">
              <div
                class="flex max-h-[520px] flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                onScroll={handleSessionsScroll}
              >
                <SessionRows sessions={sessions} activeSessionId={activeSessionId} onOpenSession={openSession} />
              </div>
            </MenuPanel>
          </AppMenu.Positioner>
        </AppMenu.Portal>
      </AppMenu.Root>
    );
  }
);
