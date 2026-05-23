import type { RecentSession, RecentSessionsChanged } from '@preload/index';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { HistoryIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { tw } from '@renderer/utils/tw';
import { formatRelativeTime } from '@renderer/utils/time';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

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
      'grid w-full gap-1 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
      active ? 'bg-control text-hover' : 'bg-transparent'
    )}
  >
    <span class="truncate text-sm leading-5 font-medium">{session.title}</span>
    <span class="text-xs leading-4 text-soft">{formatRelativeTime(session.modified)}</span>
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
  const appFocused = useAppFocusState();
  const mountedRef = useRef(true);
  const sessionsRequestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  const loadSessions = useCallback(
    async (showLoading = false) => {
      const requestId = sessionsRequestRef.current + 1;
      sessionsRequestRef.current = requestId;
      if (showLoading) setLoaded(false);

      try {
        const nextSessions = await window.pi.chat.recentSessions(workspacePath || undefined);
        if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;
        setSessions(nextSessions);
      } catch {
        if (!mountedRef.current || sessionsRequestRef.current !== requestId) return;
        setSessions([]);
      } finally {
        if (mountedRef.current && sessionsRequestRef.current === requestId) setLoaded(true);
      }
    },
    [workspacePath]
  );

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) void loadSessions();
      setOpen(nextOpen);
    },
    [loadSessions]
  );

  const openSessionAndClose = useCallback(async (session: RecentSession) => onOpenSession(session), [onOpenSession]);

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
    if (!appFocused) setOpen(false);
  }, [appFocused]);

  useEffect(() => {
    const refreshOnChange = (event: RecentSessionsChanged) => {
      if (workspacePath && event.workspacePath && event.workspacePath !== workspacePath) return;
      void loadSessions();
    };

    return window.pi.chat.onRecentSessionsChanged(refreshOnChange);
  }, [loadSessions, workspacePath]);

  return (
    <AppMenu.Root open={open} modal={false} onOpenChange={updateOpen}>
      <AppMenu.Trigger
        aria-label="Recent sessions"
        className="grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control"
      >
        <HistoryIcon class="size-5" />
      </AppMenu.Trigger>
      <AppMenu.Portal>
        <AppMenu.Positioner side="top" sideOffset={12} className="z-50" collisionPadding={12}>
          <MenuPanel className="w-90">
            <div class="flex max-h-[520px] flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
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
