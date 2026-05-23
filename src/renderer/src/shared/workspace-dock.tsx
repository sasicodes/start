import type { RecentSession } from '@preload/index';
import { RecentSessions } from '@renderer/shared/sessions';
import { Workspace } from '@renderer/shared/workspace';

export const WorkspaceDock = ({
  workspacePath,
  onOpenSession,
  activeSessionId,
  onChooseDirectory,
  onSelectWorkspace
}: {
  workspacePath: string | undefined;
  activeSessionId: string | undefined;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}) => (
  <div class="absolute bottom-4.5 left-4.5 z-40 flex items-end gap-2 [-webkit-app-region:no-drag]">
    <Workspace
      workspacePath={workspacePath}
      onChooseDirectory={onChooseDirectory}
      onSelectWorkspace={onSelectWorkspace}
    />
    <RecentSessions workspacePath={workspacePath} onOpenSession={onOpenSession} activeSessionId={activeSessionId} />
  </div>
);
