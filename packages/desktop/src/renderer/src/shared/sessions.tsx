import type { RecentSession, RecentSessionsChanged } from '@preload/index';
import { HistoryIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { NoticeDot } from '@renderer/ui/notice-dot';
import { tw } from '@renderer/utils/tw';
import { formatRelativeTime } from '@renderer/utils/time';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const sessionPageSize = 15;
const sessionPrefetchDistance = 220;

const pageOptions = (workspacePath: string, limit: number, offset = 0) => ({
  limit,
  offset,
  ...(workspacePath ? { workspacePath } : {})
});

const sessionStatus = (session: RecentSession) => {
  if (session.status && session.status !== 'idle') return session.status;
  return session.noticeKind ?? '';
};

const triggerStatus = (sessions: RecentSession[]) => {
  if (sessions.some((session) => sessionStatus(session) === 'failed')) return 'failed';
  if (sessions.some((session) => sessionStatus(session) === 'generating')) return 'generating';
  if (sessions.some((session) => sessionStatus(session) === 'completed')) return 'completed';
  return '';
};

interface SessionRowProps {
  active: boolean;
  session: RecentSession;
  onOpen: (session: RecentSession) => void;
}

interface SessionRowsProps {
  activeSessionId: string;
  sessions: RecentSession[];
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

interface RecentSessionsProps {
  workspacePath: string;
  activeSessionId: string;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

const SessionRow = ({ active, session, onOpen }: SessionRowProps) => {
  const status = sessionStatus(session);

  return (
    <AppMenu.Item
      onClick={() => onOpen(session)}
      className={tw(
        'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
        status === 'failed' && 'bg-danger/[0.055]',
        status === 'completed' && 'bg-success/[0.055]',
        status === 'generating' && 'bg-blue-500/[0.07]',
        active && 'bg-control text-hover'
      )}
    >
      <span class="col-span-2 truncate text-sm leading-5 font-medium">{session.title}</span>
      <span class="text-xs leading-4 text-soft">{formatRelativeTime(session.modified)}</span>
      {status && (
        <span class="flex h-4 items-center justify-end">
          <NoticeDot kind={status} />
        </span>
      )}
    </AppMenu.Item>
  );
};

const SessionRows = ({ sessions, activeSessionId, onOpenSession }: SessionRowsProps) =>
  sessions.map((session) => (
    <SessionRow
      key={session.id}
      session={session}
      active={session.id === activeSessionId}
      onOpen={(session) => void onOpenSession(session)}
    />
  ));

export const RecentSessions = memo(({ workspacePath, activeSessionId, onOpenSession }: RecentSessionsProps) => {
  const mountedRef = useRef(true);
  const sessionsRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const loadedCountRef = useRef(0);
  const [open, setOpen] = useState(false);
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
      } catch {
        if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;

        loadedCountRef.current = 0;
        setSessions([]);
        setHasMoreSessions(false);
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

      setSessions((currentSessions) => {
        const nextSessions = [...currentSessions, ...page.sessions];
        loadedCountRef.current = nextSessions.length;
        return nextSessions;
      });
      setHasMoreSessions(page.hasMore);
    } catch {
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMoreSessions, sessions.length, workspacePath]);

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

  const openSessionAndClose = useCallback(async (session: RecentSession) => onOpenSession(session), [onOpenSession]);

  const status = triggerStatus(sessions);

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
    const refreshOnChange = (event: RecentSessionsChanged) => {
      if (workspacePath && event.workspacePath && event.workspacePath !== workspacePath) return;
      void loadSessions(Math.max(sessionPageSize, loadedCountRef.current));
    };

    return window.pi.chat.onRecentSessionsChanged(refreshOnChange);
  }, [loadSessions, workspacePath]);

  return (
    <AppMenu.Root open={open} modal={false} onOpenChange={updateOpen}>
      <AppMenu.Trigger
        aria-label="Recent sessions"
        className={tw(
          'relative grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control',
          status === 'failed' && 'bg-danger/[0.075]',
          status === 'completed' && 'bg-success/[0.075]',
          status === 'generating' && 'bg-blue-500/[0.09]'
        )}
      >
        <HistoryIcon class="size-5" />
        {status && (
          <span class="absolute top-1.5 right-1.5">
            <NoticeDot kind={status} />
          </span>
        )}
      </AppMenu.Trigger>
      <AppMenu.Portal>
        <AppMenu.Positioner side="top" sideOffset={12} className="z-50" collisionPadding={12}>
          <MenuPanel className="w-90">
            <div
              class="flex max-h-[520px] flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
              onScroll={handleSessionsScroll}
            >
              <SessionRows sessions={sessions} activeSessionId={activeSessionId} onOpenSession={openSessionAndClose} />
            </div>
          </MenuPanel>
        </AppMenu.Positioner>
      </AppMenu.Portal>
    </AppMenu.Root>
  );
});
