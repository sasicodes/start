import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { AppMenu } from '@renderer/ui/menu';
import { Tooltip } from '@renderer/ui/tooltip';
import { useCallback, useState } from 'preact/hooks';

interface WorkspaceProps {
  workspacePath: string;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
}

export const Workspace = ({ workspacePath, onChooseDirectory, onSelectWorkspace }: WorkspaceProps) => {
  const workspace = useWorkspace(workspacePath);
  const [open, setOpen] = useState(false);
  const { folders } = useWorkspaceFolders({ workspacePath });

  const updateOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  if (!workspace) return null;

  return (
    <div class="absolute bottom-0 left-5 z-40 h-11.5 -translate-x-[calc(100%+0.5rem)] [-webkit-app-region:no-drag]">
      <AppMenu.Root modal={false} open={open} onOpenChange={updateOpen}>
        <Tooltip label={workspace.folderName}>
          <AppMenu.Trigger
            aria-label="Workspace folders"
            onMouseDown={(event: MouseEvent) => event.stopPropagation()}
            className="relative grid h-full aspect-square place-items-center overflow-hidden rounded-full border-0 bg-composer p-1.25 text-ink shadow-composer-overlay outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control"
          >
            <img
              alt=""
              src={workspace.iconDataUrl}
              draggable={false}
              class="relative z-10 size-full rounded-full object-cover"
            />
          </AppMenu.Trigger>
        </Tooltip>
        <AppMenu.Portal>
          <AppMenu.Positioner side="top" align="start" sideOffset={12} className="z-50" collisionPadding={12}>
            <WorkspaceMenu
              folders={folders}
              panelWidth="workspaceBubble"
              workspacePath={workspacePath}
              onChooseDirectory={onChooseDirectory}
              onSelectWorkspace={onSelectWorkspace}
            />
          </AppMenu.Positioner>
        </AppMenu.Portal>
      </AppMenu.Root>
    </div>
  );
};
