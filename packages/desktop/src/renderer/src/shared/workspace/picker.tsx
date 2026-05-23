import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useRef, useState } from 'preact/hooks';

export const Workspace = memo(
  ({
    workspacePath,
    onChooseDirectory,
    onSelectWorkspace
  }: {
    workspacePath: string;
    onChooseDirectory: () => void;
    onSelectWorkspace: (path: string) => void;
  }) => {
    const workspace = useWorkspace(workspacePath);
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const { folders } = useWorkspaceFolders({ workspacePath });
    const hasNotice = folders.some((folder) => folder.path === workspacePath && folder.noticeKind);

    const updateOpen = useCallback((nextOpen: boolean) => {
      setOpen(nextOpen);
    }, []);

    if (!workspace) return null;

    return (
      <div
        ref={rootRef}
        class="h-11.5 w-64 max-w-[calc(100vw-2.25rem)] text-soft transition-[width] duration-150 ease-out select-none @max-workspace-dock/chat:size-11.5"
      >
        <AppMenu.Root open={open} onOpenChange={updateOpen}>
          <Tooltip label={workspace.folderName} disabled={open}>
            <div class="block h-full w-full rounded-full">
              <AppMenu.Trigger
                aria-label="Workspace folders"
                className="flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-full border-0 bg-composer pr-1.5 pl-1.5 text-left text-soft shadow-shell outline-0 transition-[background-color,padding] duration-150 ease-out hover:bg-control focus-visible:bg-control @max-workspace-dock/chat:justify-center @max-workspace-dock/chat:gap-0 @max-workspace-dock/chat:p-1.75"
              >
                <span class="grid size-8 flex-none place-items-center overflow-hidden rounded-full bg-white">
                  <img
                    alt=""
                    src={workspace.iconDataUrl}
                    draggable={false}
                    class="size-full rounded-full object-cover"
                  />
                </span>
                <span class="flex min-w-0 flex-1 flex-col justify-center gap-0.5 transition-[opacity,transform] duration-150 ease-out @max-workspace-dock/chat:hidden">
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="truncate text-sm leading-4 font-medium text-ink">{workspace.folderName}</span>
                    {hasNotice && <span aria-hidden="true" class="size-2 flex-none rounded-full bg-emerald-500" />}
                  </span>
                  <span class="truncate text-[11px] leading-3 font-medium text-soft">
                    {workspace.branchName ?? workspace.path}
                  </span>
                </span>
                <span aria-hidden="true" class="h-full w-0.5 shrink-0 bg-line @max-workspace-dock/chat:hidden" />
                <span class="grid h-full w-8 shrink-0 place-items-center rounded-r-full text-ink @max-workspace-dock/chat:hidden">
                  <ChevronDownIcon
                    class={tw(
                      'size-4 -translate-x-px transition-transform duration-150 ease-out',
                      open && 'rotate-180'
                    )}
                  />
                </span>
              </AppMenu.Trigger>
            </div>
          </Tooltip>
          <AppMenu.Portal>
            <AppMenu.Positioner
              side="top"
              align="start"
              anchor={rootRef}
              sideOffset={8}
              className="z-50"
              collisionPadding={12}
            >
              <MenuPanel className="w-64">
                <WorkspaceMenu
                  folders={folders}
                  workspacePath={workspacePath}
                  onChooseDirectory={onChooseDirectory}
                  onSelectWorkspace={onSelectWorkspace}
                />
              </MenuPanel>
            </AppMenu.Positioner>
          </AppMenu.Portal>
        </AppMenu.Root>
      </div>
    );
  }
);
