import type { RecentSession } from '@preload/index';
import { HistoryIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import { formatRelativeTime } from '@renderer/utils/time';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'preact/hooks';

const EmptySessions = () => <li class="px-3 py-8 text-center text-sm text-soft">No recent sessions</li>;

const SessionIcon = ({ open }: { open: boolean }) => (
  <AnimatePresence>
    {!open && (
      <motion.span
        key="history-icon"
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.82 }}
        initial={{ opacity: 0, scale: 0.82 }}
        transition={{ duration: 0.12 }}
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
      <span class="text-xs leading-4 text-soft">
        {formatRelativeTime(session.modified)} · {session.messageCount} messages
      </span>
    </button>
  </li>
);

const SessionRows = ({
  sessions,
  onOpenSession,
  activeSessionId
}: {
  sessions: RecentSession[];
  activeSessionId: string | undefined;
  onOpenSession: (path: string) => Promise<boolean>;
}) => {
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
  onOpenSession,
  activeSessionId
}: {
  open: boolean;
  sessions: RecentSession[];
  activeSessionId: string | undefined;
  onOpenSession: (path: string) => Promise<boolean>;
}) => (
  <AnimatePresence>
    {open && (
      <motion.ul
        key="sessions"
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4, transition: { duration: 0.08 } }}
        initial={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.1, delay: 0.03 }}
        class="flex h-full flex-col gap-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <SessionRows sessions={sessions} onOpenSession={onOpenSession} activeSessionId={activeSessionId} />
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
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const expandedHeight = sessions.length > 0 ? 520 : 108;

  useEffect(() => {
    if (!open) return;

    void window.pi.chat.recentSessions().then(setSessions);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnPointerDown, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} class="absolute bottom-4.5 left-4.5 z-40 size-11.5 [-webkit-app-region:no-drag]">
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
          if (!open) setOpen(true);
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (!open && (event.key === 'Enter' || event.key === ' ')) setOpen(true);
        }}
        role="button"
        tabIndex={0}
        transition={
          open ? { type: 'spring', duration: 0.18, bounce: 0.1 } : { type: 'spring', duration: 0.12, bounce: 0.1 }
        }
        style={{ transformOrigin: 'bottom left' }}
        class="absolute bottom-0 left-0 overflow-hidden bg-composer text-ink shadow-shell outline-0 select-none focus-visible:opacity-90"
      >
        <SessionIcon open={open} />
        <SessionContent
          open={open}
          sessions={sessions}
          onOpenSession={onOpenSession}
          activeSessionId={activeSessionId}
        />
      </motion.div>
    </div>
  );
};
