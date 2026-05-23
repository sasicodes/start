import type { WorkspaceFolder } from '@preload/index';
import { useWorkspace } from '@renderer/shared/use-workspace';
import { WorkspaceMenu } from '@renderer/shared/workspace-menu';
import { cachedWorkspaceFolders, loadWorkspaceFolders } from '@renderer/shared/workspace-folders';
import { AppMenu } from '@renderer/ui/menu';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { useCallback, useEffect, useState } from 'preact/hooks';

export const ComposerWorkspacePicker = ({
  workspacePath,
  onChooseDirectory,
  onSelectWorkspace
}: {
  workspacePath: string | undefined;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
}) => {
  const workspace = useWorkspace(workspacePath);
  const [folders, setFolders] = useState<WorkspaceFolder[]>(cachedWorkspaceFolders() ?? []);
  const [open, setOpen] = useState(false);

  const refreshFolders = useCallback(() => {
    void loadWorkspaceFolders()
      .then(setFolders)
      .catch(() => setFolders(cachedWorkspaceFolders() ?? []));
  }, []);

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) return;

      const cachedFolders = cachedWorkspaceFolders();
      if (cachedFolders) setFolders(cachedFolders);
      refreshFolders();
    },
    [refreshFolders]
  );

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders, workspacePath]);

  useEffect(() => window.pi.chat.onRecentSessionsChanged(refreshFolders), [refreshFolders]);

  if (!workspace) return null;

  return (
    <div class="absolute top-0 bottom-0 left-5 z-40 -translate-x-[calc(100%+0.5rem)] [-webkit-app-region:no-drag]">
      <AppMenu.Root modal={false} open={open} onOpenChange={updateOpen}>
        <CommonTooltip label={workspace.folderName}>
          <AppMenu.Trigger
            aria-label="Workspace folders"
            onMouseDown={(event: MouseEvent) => event.stopPropagation()}
            className="composer-floating-field relative grid h-full aspect-square place-items-center overflow-hidden rounded-full border-0 bg-composer p-1.25 text-ink outline-0 transition-transform duration-150 ease-out select-none hover:scale-[0.98] focus-visible:scale-[0.98]"
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
