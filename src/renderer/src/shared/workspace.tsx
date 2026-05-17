import type { WorkspaceFolder } from '@preload/index';
import { useWorkspace } from '@renderer/shared/use-workspace';
import { ChevronDownIcon, FolderIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { cn } from '@renderer/utils/cn';
import { useCallback, useRef, useState } from 'preact/hooks';

const WorkspaceFolderItem = ({ folder }: { folder: WorkspaceFolder }) => (
  <AppMenu.Item
    closeOnClick={false}
    className="grid w-full gap-0.5 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
  >
    <span class="truncate">{folder.name}</span>
    <span class="truncate text-xs leading-4 font-normal text-soft">{folder.path}</span>
  </AppMenu.Item>
);

export const Workspace = () => {
  const workspace = useWorkspace();
  const rootRef = useRef<HTMLDivElement>(null);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [open, setOpen] = useState(false);

  const updateOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;

    void window.pi.chat
      .workspaceFolders()
      .then(setFolders)
      .catch(() => setFolders([]));
  }, []);

  if (!workspace) return null;

  return (
    <div ref={rootRef} class="flex h-11.5 max-w-64 min-w-0 items-center gap-px text-soft select-none">
      <span class="flex h-full min-w-0 items-center gap-2 rounded-[23px_3px_3px_23px] bg-composer py-1.5 pr-3 pl-1.5 shadow-shell">
        <span class="grid size-8 flex-none place-items-center overflow-hidden rounded-full bg-white">
          <img
            src={workspace.iconDataUrl}
            alt=""
            class="size-full min-h-full min-w-full rounded-full object-cover"
            draggable={false}
          />
        </span>
        <span class="flex min-w-0 max-w-40 flex-col justify-center gap-0.5">
          <span class="truncate text-sm leading-4 font-medium text-ink">{workspace.folderName}</span>
          {workspace.branchName && (
            <span class="truncate text-[11px] leading-3 font-medium text-soft">{workspace.branchName}</span>
          )}
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
                <WorkspaceFolderItem key={folder.path} folder={folder} />
              ))}
              <AppMenu.Item
                closeOnClick={false}
                className="grid w-full grid-cols-[auto_1fr] items-center gap-2 rounded-xl px-3 py-3 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
              >
                <FolderIcon class="size-4.5" />
                <span class="leading-5">Choose a directory</span>
              </AppMenu.Item>
            </MenuPanel>
          </AppMenu.Positioner>
        </AppMenu.Portal>
      </AppMenu.Root>
    </div>
  );
};
