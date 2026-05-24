import type { AgentTabStatus, RecentSession, RecentSessionsChanged } from '@preload/index';
import { HistoryIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { Indicator } from '@renderer/shared/indicator';
import { tw } from '@renderer/utils/tw';
import { formatRelativeTime } from '@renderer/utils/time';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const sessionPageSize = 15;
const sessionPrefetchDistance = 220;

type SessionIndicatorKind = Exclude<AgentTabStatus, 'idle'>;
type RecentIndicatorKind = SessionIndicatorKind | '';

const pageOptions = (workspacePath: string, limit: number, offset = 0) => ({
  limit,
  offset,
  ...(workspacePath ? { workspacePath } : {})
});

const statusNeedsIndicator = (status: AgentTabStatus | undefined): status is SessionIndicatorKind =>
  Boolean(status && status !== 'idle');

const presentIndicatorKind = (kind: RecentIndicatorKind): kind is SessionIndicatorKind => Boolean(kind);

const sessionIndicatorKind = (
  session: RecentSession,
  activeSessionId: string,
  isGenerating: boolean
): RecentIndicatorKind => {
  if (session.id === activeSessionId && isGenerating) return 'generating';
  if (statusNeedsIndicator(session.status)) return session.status;
  return session.noticeKind ?? '';
};

const indicatorKindPriority = (kinds: RecentIndicatorKind[]): RecentIndicatorKind => {
  if (kinds.includes('failed')) return 'failed';
  if (kinds.includes('generating')) return 'generating';
  if (kinds.includes('completed')) return 'completed';
  return '';
};

const sessionIndicatorKinds = (sessions: RecentSession[], activeSessionId: string, isGenerating: boolean) =>
  sessions.map((session) => sessionIndicatorKind(session, activeSessionId, isGenerating)).filter(presentIndicatorKind);

const triggerIndicatorKind = (sessions: RecentSession[], activeSessionId: string, isGenerating: boolean) =>
  indicatorKindPriority(sessionIndicatorKinds(sessions, activeSessionId, isGenerating));

const acknowledgeSession = (session: RecentSession): RecentSession => {
  const { noticeKind, status, ...rest } = session;
  if (status && status !== 'completed' && status !== 'failed') return { ...rest, status };
  return rest;
};

const acknowledgeSessionById = (sessions: RecentSession[], sessionId: string) =>
  sessions.map((session) => (session.id === sessionId ? acknowledgeSession(session) : session));

interface SessionRowProps {
  active: boolean;
  isGenerating: boolean;
  session: RecentSession;
  onOpen: (session: RecentSession) => void;
}

interface SessionRowsProps {
  isGenerating: boolean;
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

const SessionRow = ({ active, isGenerating, session, onOpen }: SessionRowProps) => {
  const kind = sessionIndicatorKind(session, active ? session.id : '', isGenerating);

  return (
    <AppMenu.Item
      onClick={() => onOpen(session)}
      className={tw(
        'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
        active && 'bg-control text-hover',
        kind === 'failed' && 'bg-danger/[0.055]',
        kind === 'completed' && 'bg-success/[0.055]',
        kind === 'generating' && 'bg-blue-500/[0.07]'
      )}
    >
      <span class="col-span-2 truncate text-sm leading-5 font-medium">{session.title}</span>
      <span class="text-xs leading-4 text-soft">{formatRelativeTime(session.modified)}</span>
      {kind && (
        <span class="flex h-4 items-center justify-end">
          <Indicator kind={kind} />
        </span>
      )}
    </AppMenu.Item>
  );
};

const SessionRows = ({ sessions, activeSessionId, isGenerating, onOpenSession }: SessionRowsProps) =>
  sessions.map((session) => (
    <SessionRow
      key={session.id}
      session={session}
      isGenerating={isGenerating}
      active={session.id === activeSessionId}
      onOpen={(session) => void onOpenSession(session)}
    />
  ));

export const RecentSessions = memo(
  ({ workspacePath, activeSessionId, isGenerating, onOpenSession }: RecentSessionsProps) => {
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

    const kind = triggerIndicatorKind(sessions, activeSessionId, isGenerating);

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
      if (!isGenerating) void loadSessions(Math.max(sessionPageSize, loadedCountRef.current));
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

    return (
      <AppMenu.Root open={open} modal={false} onOpenChange={updateOpen}>
        <AppMenu.Trigger
          aria-label="Recent sessions"
          className={tw(
            'relative grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control',
            kind === 'failed' && 'bg-danger/[0.075]',
            kind === 'completed' && 'bg-success/[0.075]',
            kind === 'generating' && 'bg-blue-500/[0.09]'
          )}
        >
          <HistoryIcon class="size-5" />
          {kind && (
            <span class="pointer-events-none absolute top-[3px] right-[3px] z-10">
              <Indicator kind={kind} />
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
                  sessions={sessions}
                  isGenerating={isGenerating}
                  activeSessionId={activeSessionId}
                  onOpenSession={openSession}
                />
              </div>
            </MenuPanel>
          </AppMenu.Positioner>
        </AppMenu.Portal>
      </AppMenu.Root>
    );
  }
);
