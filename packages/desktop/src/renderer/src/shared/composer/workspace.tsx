import { attentionStatus, topAttentionStatus } from '@renderer/shared/attention-status';
import { Indicator } from '@renderer/shared/indicator';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { Tooltip } from '@renderer/ui/tooltip';
import { useState } from 'preact/hooks';

interface WorkspaceProps {
  workspacePath: string;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
}

export const Workspace = ({ workspacePath, onChooseDirectory, onSelectWorkspace }: WorkspaceProps) => {
  const [open, setOpen] = useState(false);
  const workspace = useWorkspace(workspacePath);
  const { folders } = useWorkspaceFolders({ workspacePath });
  const attention = topAttentionStatus(
    folders
      .filter((folder) => folder.path !== workspacePath)
      .map((folder) => attentionStatus(folder.status, folder.noticeKind))
  );

  if (!workspace) return null;

  return (
    <div class="absolute bottom-0 left-5 z-40 h-11.5 -translate-x-[calc(100%+0.5rem)] [-webkit-app-region:no-drag]">
      <AppMenu.Root modal={false} open={open} onOpenChange={setOpen}>
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
            {attention && (
              <span class="pointer-events-none absolute top-[3px] right-[3px] z-10">
                <Indicator kind={attention} />
              </span>
            )}
          </AppMenu.Trigger>
        </Tooltip>
        <AppMenu.Portal>
          <AppMenu.Positioner side="top" align="center" sideOffset={12} className="z-50" collisionPadding={12}>
            <MenuPanel className="w-64">
              <WorkspaceMenu
                folders={folders}
                onSelect={onSelectWorkspace}
                workspacePath={workspacePath}
                onChooseDirectory={onChooseDirectory}
              />
            </MenuPanel>
          </AppMenu.Positioner>
        </AppMenu.Portal>
      </AppMenu.Root>
    </div>
  );
};
