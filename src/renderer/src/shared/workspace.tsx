import type { WorkspaceFolder } from '@preload/index';
import { useWorkspace } from '@renderer/shared/use-workspace';
import { cachedWorkspaceFolders, loadWorkspaceFolders } from '@renderer/shared/workspace-folders';
import { ChevronDownIcon, FolderIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { cn } from '@renderer/utils/cn';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const WorkspaceFolderItem = ({
  folder,
  onSelectWorkspace
}: {
  folder: WorkspaceFolder;
  onSelectWorkspace: (path: string) => void;
}) => (
  <AppMenu.Item
    closeOnClick
    onClick={() => onSelectWorkspace(folder.path)}
    className="grid w-full gap-0.5 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
  >
    <span class="truncate">{folder.name}</span>
    <span class="truncate text-xs leading-4 font-normal text-soft">{folder.path}</span>
  </AppMenu.Item>
);

export const Workspace = ({
  workspacePath,
  onChooseDirectory,
  onSelectWorkspace
}: {
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
  workspacePath: string | undefined;
}) => {
  const workspace = useWorkspace(workspacePath);
  const rootRef = useRef<HTMLDivElement>(null);
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
    <div ref={rootRef} class="flex h-11.5 min-w-48 max-w-64 items-center gap-px text-soft select-none">
      <span class="flex h-full min-w-0 flex-1 items-center gap-2 rounded-[23px_3px_3px_23px] bg-composer py-1.5 pr-3 pl-1.5 shadow-shell">
        <span class="grid size-8 flex-none place-items-center overflow-hidden rounded-full bg-white">
          <img src={workspace.iconDataUrl} alt="" class="size-full rounded-full object-cover" draggable={false} />
        </span>
        <span class="flex min-w-0 max-w-40 flex-col justify-center gap-0.5">
          <span class="truncate text-sm leading-4 font-medium text-ink">{workspace.folderName}</span>
          <span class="truncate text-[11px] leading-3 font-medium text-soft">
            {workspace.branchName ?? workspace.path}
          </span>
        </span>
      </span>
      <AppMenu.Root open={open} onOpenChange={updateOpen}>
        <AppMenu.Trigger
          aria-label="Workspace folders"
          className="grid size-11.5 flex-none place-items-center rounded-[3px_23px_23px_3px] border-0 bg-composer text-ink shadow-shell outline-0 transition-colors hover:bg-control focus-visible:bg-control"
        >
          <ChevronDownIcon
            class={cn('-ml-px size-4 transition-transform duration-150 ease-out', open && 'rotate-180')}
          />
        </AppMenu.Trigger>
        <AppMenu.Portal>
          <AppMenu.Positioner
            anchor={rootRef}
            side="top"
            align="start"
            sideOffset={8}
            className="z-50"
            collisionPadding={12}
          >
            <MenuPanel width="workspace">
              {folders.map((folder) => (
                <WorkspaceFolderItem key={folder.path} folder={folder} onSelectWorkspace={onSelectWorkspace} />
              ))}
              <AppMenu.Item
                closeOnClick
                onClick={onChooseDirectory}
                className="grid w-full grid-cols-[auto_1fr] items-center gap-2 rounded-xl px-3 py-3 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
              >
                <FolderIcon class="size-4.5" />
                <span class="text-xs leading-5">Choose a directory</span>
              </AppMenu.Item>
            </MenuPanel>
          </AppMenu.Positioner>
        </AppMenu.Portal>
      </AppMenu.Root>
    </div>
  );
};
