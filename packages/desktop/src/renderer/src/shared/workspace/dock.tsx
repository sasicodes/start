import type { RecentSession } from '@preload/index';
import { RecentSessions } from '@renderer/shared/sessions';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { Workspace } from '@renderer/shared/workspace/picker';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { EditIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'preact/compat';

interface WorkspaceDockProps {
  isGenerating: boolean;
  workspacePath: string;
  activeSessionId: string;
  showNewSession: boolean;
  onNewSession: () => void;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

export const WorkspaceDock = memo(
  ({
    workspacePath,
    isGenerating,
    activeSessionId,
    onNewSession,
    onOpenSession,
    showNewSession,
    onChooseDirectory,
    onSelectWorkspace
  }: WorkspaceDockProps) => {
    const appFocused = useAppFocusState();

    return (
      <div
        class={tw(
          'absolute bottom-4.5 left-4.5 z-40 h-11.5 transition-opacity duration-75 ease-out [-webkit-app-region:no-drag] @max-bottom-controls/chat:pointer-events-none @max-bottom-controls/chat:opacity-0',
          !appFocused && 'pointer-events-none'
        )}
      >
        <AnimatePresence initial={false}>
          {appFocused && (
            <motion.div
              key="workspace-dock-controls"
              class="flex h-full items-center gap-2"
              animate={bottomBubbleVisibleMotion}
              initial={bottomBubbleHiddenMotion}
              transition={bottomBubbleRevealTransition}
              exit={{ ...bottomBubbleHiddenMotion, transition: bottomBubbleHideTransition }}
            >
              <Workspace
                collapsed={showNewSession}
                workspacePath={workspacePath}
                onChooseDirectory={onChooseDirectory}
                onSelectWorkspace={onSelectWorkspace}
              />
              <RecentSessions
                isGenerating={isGenerating}
                workspacePath={workspacePath}
                activeSessionId={activeSessionId}
                onOpenSession={onOpenSession}
              />
              {showNewSession && (
                <Tooltip label="New session">
                  <button
                    type="button"
                    aria-label="New session"
                    onClick={onNewSession}
                    class="grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control"
                  >
                    <EditIcon class="size-5" />
                  </button>
                </Tooltip>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
