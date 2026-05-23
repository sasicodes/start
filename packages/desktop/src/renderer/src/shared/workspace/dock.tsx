import type { RecentSession } from '@preload/index';
import { RecentSessions } from '@renderer/shared/sessions';
import { Workspace } from '@renderer/shared/workspace/picker';
import { memo } from 'preact/compat';

interface WorkspaceDockProps {
  workspacePath: string;
  activeSessionId: string;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

export const WorkspaceDock = memo(
  ({ workspacePath, onOpenSession, activeSessionId, onChooseDirectory, onSelectWorkspace }: WorkspaceDockProps) => (
    <div class="absolute bottom-4.5 left-4.5 z-40 flex items-end gap-2 transition-opacity duration-75 ease-out [-webkit-app-region:no-drag] @max-bottom-controls/chat:pointer-events-none @max-bottom-controls/chat:opacity-0">
      <Workspace
        workspacePath={workspacePath}
        onChooseDirectory={onChooseDirectory}
        onSelectWorkspace={onSelectWorkspace}
      />
      <RecentSessions workspacePath={workspacePath} onOpenSession={onOpenSession} activeSessionId={activeSessionId} />
    </div>
  )
);
