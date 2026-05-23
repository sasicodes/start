import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { AppMenu } from '@renderer/ui/menu';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { useCallback, useState } from 'preact/hooks';

export const ComposerWorkspacePicker = ({
  workspacePath,
  onChooseDirectory,
  onSelectWorkspace
}: {
  workspacePath: string;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
}) => {
  const workspace = useWorkspace(workspacePath);
  const [open, setOpen] = useState(false);
  const { folders, refreshFolders } = useWorkspaceFolders({ active: open, workspacePath });

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) refreshFolders();
    },
    [refreshFolders]
  );

  if (!workspace) return null;

  return (
    <div class="absolute top-0 bottom-0 left-5 z-40 -translate-x-[calc(100%+0.5rem)] [-webkit-app-region:no-drag]">
      <AppMenu.Root modal={false} open={open} onOpenChange={updateOpen}>
        <CommonTooltip label={workspace.folderName}>
          <AppMenu.Trigger
            aria-label="Workspace folders"
            onMouseDown={(event: MouseEvent) => event.stopPropagation()}
            className="relative grid h-full aspect-square animate-composer-overlay-field-in place-items-center overflow-hidden rounded-full border-0 bg-composer p-1.25 text-ink shadow-composer-overlay outline-0 transition-transform duration-150 ease-out select-none hover:scale-[0.98] focus-visible:scale-[0.98]"
          >
            <img
              alt=""
              src={workspace.iconDataUrl}
              draggable={false}
              class="relative z-10 size-full rounded-full object-cover"
            />
          </AppMenu.Trigger>
        </CommonTooltip>
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
