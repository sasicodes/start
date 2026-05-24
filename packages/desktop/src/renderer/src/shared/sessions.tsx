import type { RecentSession, RecentSessionsChanged } from '@preload/index';
import { HistoryIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { NoticeDot } from '@renderer/ui/notice-dot';
import { tw } from '@renderer/utils/tw';
import { formatRelativeTime } from '@renderer/utils/time';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const sessionPageSize = 15;

const EmptySessions = () => <div class="px-3 py-8 text-center text-sm text-soft">No recent sessions</div>;

const SessionRow = ({
  active,
  onOpen,
  session
}: {
  active: boolean;
  session: RecentSession;
  onOpen: (session: RecentSession) => void;
}) => (
  <AppMenu.Item
    onClick={() => onOpen(session)}
    className={tw(
      'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
      active ? 'bg-control text-hover' : 'bg-transparent'
    )}
  >
    <span class="flex min-w-0 flex-col gap-1">
      <span class="truncate text-sm leading-5 font-medium">{session.title}</span>
      <span class="text-xs leading-4 text-soft">{formatRelativeTime(session.modified)}</span>
    </span>
    {session.noticeKind && <NoticeDot />}
  </AppMenu.Item>
);

const SessionRows = ({
  loaded,
  sessions,
  activeSessionId,
  onOpenSession
}: {
  loaded: boolean;
  activeSessionId: string;
  sessions: RecentSession[];
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}) => {
  if (!loaded) return null;
  if (sessions.length === 0) return <EmptySessions />;

  return sessions.map((session) => (
    <SessionRow
      key={session.id}
      session={session}
      active={session.id === activeSessionId}
      onOpen={(session) => void onOpenSession(session)}
    />
  ));
};

interface RecentSessionsProps {
  workspacePath: string;
  activeSessionId: string;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

export const RecentSessions = memo(({ workspacePath, activeSessionId, onOpenSession }: RecentSessionsProps) => {
  const mountedRef = useRef(true);
  const sessionsRequestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);
  const loadingMoreRef = useRef(false);
  const loadedCountRef = useRef(0);

  const loadSessions = useCallback(
    async (showLoading = false, limit = sessionPageSize) => {
      const requestId = sessionsRequestRef.current + 1;
      sessionsRequestRef.current = requestId;
      if (showLoading) setLoaded(false);

      try {
        const page = await window.pi.chat.recentSessionsPage({ limit, ...(workspacePath ? { workspacePath } : {}) });
        if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;
        loadedCountRef.current = page.sessions.length;
        setSessions(page.sessions);
        setHasMoreSessions(page.hasMore);
      } catch {
        if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;
        loadedCountRef.current = 0;
        setSessions([]);
        setHasMoreSessions(false);
      } finally {
        if (mountedRef.current && sessionsRequestRef.current === requestId) setLoaded(true);
      }
    },
    [workspacePath]
  );

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) void loadSessions(false, Math.max(sessionPageSize, loadedCountRef.current));
      setOpen(nextOpen);
    },
    [loadSessions]
  );

  const openSessionAndClose = useCallback(async (session: RecentSession) => onOpenSession(session), [onOpenSession]);

  const hasNotice = sessions.some((session) => session.noticeKind);

  const loadMoreSessions = useCallback(async () => {
    const lastSession = sessions.at(-1);
    if (!hasMoreSessions || !lastSession || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    const requestId = sessionsRequestRef.current;
    try {
      const page = await window.pi.chat.recentSessionsPage({
        limit: sessionPageSize,
        cursor: `${lastSession.modified}:${lastSession.id}`,
        ...(workspacePath ? { workspacePath } : {})
      });
      if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;

      setSessions((currentSessions) => {
        const sessionsById = new Map(currentSessions.map((session) => [session.id, session]));
        for (const session of page.sessions) sessionsById.set(session.id, session);
        const nextSessions = [...sessionsById.values()];
        loadedCountRef.current = nextSessions.length;
        return nextSessions;
      });
      setHasMoreSessions(page.hasMore);
    } catch {
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMoreSessions, sessions, workspacePath]);

  const handleSessionsScroll = useCallback(
    (event: Event) => {
      if (!hasMoreSessions) return;

      const element = event.currentTarget;
      if (!(element instanceof HTMLElement)) return;
      if (element.scrollHeight - element.scrollTop - element.clientHeight > 80) return;

      void loadMoreSessions();
    },
    [hasMoreSessions, loadMoreSessions]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sessionsRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    void loadSessions(true);
  }, [loadSessions]);

  useEffect(() => {
    const refreshOnChange = (event: RecentSessionsChanged) => {
      if (workspacePath && event.workspacePath && event.workspacePath !== workspacePath) return;
      void loadSessions(false, Math.max(sessionPageSize, loadedCountRef.current));
    };

    return window.pi.chat.onRecentSessionsChanged(refreshOnChange);
  }, [loadSessions, workspacePath]);

  return (
    <AppMenu.Root open={open} modal={false} onOpenChange={updateOpen}>
      <AppMenu.Trigger
        aria-label="Recent sessions"
        className="relative grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control"
      >
        <HistoryIcon class="size-5" />
        {hasNotice && (
          <span class="absolute top-1.5 right-1.5">
            <NoticeDot />
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
              <SessionRows
                loaded={loaded}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onOpenSession={openSessionAndClose}
              />
            </div>
          </MenuPanel>
        </AppMenu.Positioner>
      </AppMenu.Portal>
    </AppMenu.Root>
  );
});
