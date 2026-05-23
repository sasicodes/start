import type { RecentSession, RecentSessionsChanged } from '@preload/index';
import { HistoryIcon } from '@renderer/ui/icons';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { cn } from '@renderer/utils/cn';
import { formatRelativeTime } from '@renderer/utils/time';
import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const EmptySessions = () => <li class="px-3 py-8 text-center text-sm text-soft">No recent sessions</li>;

const SessionToggle = ({ hidden, onOpen }: { hidden: boolean; onOpen: () => void }) => (
  <AnimatePresence>
    {!hidden && (
      <motion.button
        key="history-button"
        type="button"
        animate={{ opacity: 1, scale: 1 }}
        aria-label="Recent sessions"
        exit={{ opacity: 0, scale: 0.82 }}
        initial={{ opacity: 0, scale: 0.82 }}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onOpen();
        }}
        transition={{ duration: 0.08 }}
        class="absolute inset-0 grid place-items-center rounded-full border-0 bg-transparent text-ink outline-0 transition-colors hover:bg-control focus-visible:bg-control"
      >
        <HistoryIcon class="size-5" />
      </motion.button>
    )}
  </AnimatePresence>
);

const SessionRow = ({
  active,
  session,
  onOpen
}: {
  active: boolean;
  session: RecentSession;
  onOpen: (session: RecentSession) => void;
}) => (
  <li>
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(session);
      }}
      class={cn(
        'grid w-full gap-1 rounded-xl border-0 px-3 py-2 text-left text-ink outline-0 transition-colors hover:bg-control focus-visible:bg-control',
        active ? 'bg-control text-hover' : 'bg-transparent'
      )}
    >
      <span class="truncate text-sm leading-5 font-medium">{session.title}</span>
      <span class="text-xs leading-4 text-soft">{formatRelativeTime(session.modified)}</span>
    </button>
  </li>
);

const SessionRows = ({
  sessions,
  loaded,
  onOpenSession,
  activeSessionId
}: {
  sessions: RecentSession[];
  loaded: boolean;
  activeSessionId: string;
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

const SessionContent = ({
  open,
  sessions,
  loaded,
  onOpenSession,
  activeSessionId
}: {
  open: boolean;
  sessions: RecentSession[];
  loaded: boolean;
  activeSessionId: string;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}) => (
  <AnimatePresence>
    {open && (
      <motion.ul
        key="sessions"
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4, transition: closeMotionTransition }}
        initial={{ opacity: 0, y: 4 }}
        transition={{ ...openMotionTransition, delay: 0.05 }}
        class="flex h-full w-90 flex-col gap-1 overflow-y-auto p-1 [&::-webkit-scrollbar]:hidden"
      >
        <SessionRows
          sessions={sessions}
          loaded={loaded}
          onOpenSession={onOpenSession}
          activeSessionId={activeSessionId}
        />
      </motion.ul>
    )}
  </AnimatePresence>
);

interface RecentSessionsProps {
  workspacePath: string;
  activeSessionId: string;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

export const RecentSessions = memo(({ onOpenSession, workspacePath, activeSessionId }: RecentSessionsProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const sessionsRequestRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const expandedHeight = !loaded || sessions.length > 0 ? 520 : 108;
  const panelTransition = open ? openMotionTransition : closeMotionTransition;

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

  const closeSessions = useCallback(() => {
    setOpen(false);
  }, []);

  const openSessions = useCallback(() => {
    if (open) return;
    void loadSessions();
    setOpen(true);
  }, [loadSessions, open]);

  const openSessionAndClose = useCallback(
    async (session: RecentSession) => {
      closeSessions();
      return onOpenSession(session);
    },
    [closeSessions, onOpenSession]
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
      void loadSessions();
    };

    return window.pi.chat.onRecentSessionsChanged(refreshOnChange);
  }, [loadSessions, workspacePath]);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      closeSessions();
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSessions();
    };

    document.addEventListener('pointerdown', closeOnPointerDown, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeSessions, open]);

  return (
    <div ref={rootRef} class="relative size-11.5">
      <motion.div
        animate={{
          width: open ? 360 : 46,
          height: open ? expandedHeight : 46,
          borderRadius: open ? 16 : 23
        }}
        initial={false}
        transition={{ width: panelTransition, height: panelTransition, borderRadius: panelTransition }}
        class="absolute bottom-0 left-0 origin-bottom-left overflow-hidden bg-composer text-ink shadow-shell outline-0 select-none focus-visible:opacity-90"
      >
        <SessionToggle hidden={open} onOpen={openSessions} />
        <SessionContent
          open={open}
          sessions={sessions}
          loaded={loaded}
          onOpenSession={openSessionAndClose}
          activeSessionId={activeSessionId}
        />
      </motion.div>
    </div>
  );
});
