import type { RecentSession } from '@preload/index';
import { HistoryIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import { formatRelativeTime } from '@renderer/utils/time';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const EmptySessions = () => <li class="px-3 py-8 text-center text-sm text-soft">No recent sessions</li>;
const ICON_EXIT_DELAY = 70;
const ICON_RETURN_DELAY = 130;

const SessionIcon = ({ hidden }: { hidden: boolean }) => (
  <AnimatePresence>
    {!hidden && (
      <motion.span
        key="history-icon"
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.82 }}
        initial={{ opacity: 0, scale: 0.82 }}
        transition={{ duration: 0.08 }}
        class="absolute inset-0 grid place-items-center"
      >
        <HistoryIcon class="size-5" />
      </motion.span>
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
  onOpen: (path: string) => void;
}) => (
  <li>
    <button
      type="button"
      onClick={() => onOpen(session.path)}
      class={cn(
        'grid w-full gap-1 rounded-2xl border-0 px-3 py-2.5 text-left text-ink outline-0 transition-colors hover:bg-control focus-visible:bg-control',
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
  activeSessionId: string | undefined;
  onOpenSession: (path: string) => Promise<boolean>;
}) => {
  if (!loaded) return null;
  if (sessions.length === 0) return <EmptySessions />;

  return sessions.map((session) => (
    <SessionRow
      key={session.id}
      session={session}
      active={session.id === activeSessionId}
      onOpen={(path) => void onOpenSession(path)}
    />
  ));
};

const SessionContent = ({
  open,
  sessions,
  loaded,
  onOpenSession,
  activeSessionId,
  expandedHeight
}: {
  open: boolean;
  sessions: RecentSession[];
  loaded: boolean;
  activeSessionId: string | undefined;
  expandedHeight: number;
  onOpenSession: (path: string) => Promise<boolean>;
}) => (
  <AnimatePresence>
    {open && (
      <motion.ul
        key="sessions"
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4, transition: { duration: 0.1, ease: 'easeOut' } }}
        initial={{ opacity: 0, y: 4 }}
        style={{ width: 360, height: expandedHeight }}
        transition={{ duration: 0.12, delay: 0.05, ease: 'easeOut' }}
        class="flex h-full flex-col gap-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

export const RecentSessions = ({
  onOpenSession,
  activeSessionId
}: {
  activeSessionId: string | undefined;
  onOpenSession: (path: string) => Promise<boolean>;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sessionsRequestRef = useRef(0);
  const [iconHidden, setIconHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const expandedHeight = !loaded || sessions.length > 0 ? 520 : 108;
  const panelTransition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] };

  const clearOpenTimer = useCallback(() => {
    if (!openTimerRef.current) return;
    clearTimeout(openTimerRef.current);
    openTimerRef.current = undefined;
  }, []);

  const loadSessions = useCallback(async () => {
    const requestId = sessionsRequestRef.current + 1;
    sessionsRequestRef.current = requestId;

    try {
      const nextSessions = await window.pi.chat.recentSessions();
      if (sessionsRequestRef.current !== requestId) return;
      setSessions(nextSessions);
    } catch {
      if (sessionsRequestRef.current !== requestId) return;
      setSessions([]);
    } finally {
      if (sessionsRequestRef.current === requestId) setLoaded(true);
    }
  }, []);

  const closeSessions = useCallback(() => {
    setOpen(false);
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setIconHidden(false), ICON_RETURN_DELAY);
  }, [clearOpenTimer]);

  const openSessions = useCallback(() => {
    if (open) return;
    void loadSessions();
    setIconHidden(true);
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setOpen(true), ICON_EXIT_DELAY);
  }, [clearOpenTimer, loadSessions, open]);

  useEffect(() => {
    void loadSessions();
  }, [activeSessionId, loadSessions]);

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

  useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

  return (
    <div ref={rootRef} class="relative size-11.5">
      <motion.div
        animate={{
          width: open ? 360 : 46,
          height: open ? expandedHeight : 46,
          borderRadius: 23
        }}
        aria-expanded={open}
        aria-label="Recent sessions"
        initial={false}
        onClick={() => {
          if (!open) openSessions();
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (!open && (event.key === 'Enter' || event.key === ' ')) openSessions();
        }}
        role="button"
        tabIndex={0}
        transition={{ width: panelTransition, height: panelTransition, borderRadius: panelTransition }}
        style={{ transformOrigin: 'bottom left' }}
        class="absolute bottom-0 left-0 overflow-hidden bg-composer text-ink shadow-shell outline-0 select-none focus-visible:opacity-90"
      >
        <SessionIcon hidden={iconHidden} />
        <SessionContent
          open={open}
          sessions={sessions}
          loaded={loaded}
          expandedHeight={expandedHeight}
          onOpenSession={onOpenSession}
          activeSessionId={activeSessionId}
        />
      </motion.div>
    </div>
  );
};
