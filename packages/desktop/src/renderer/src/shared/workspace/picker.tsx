import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { AppMenu } from '@renderer/ui/menu';
import { Tooltip } from '@renderer/ui/tooltip';
import { cn } from '@renderer/utils/cn';
import { memo } from 'preact/compat';
import { useCallback, useRef, useState } from 'preact/hooks';

export const Workspace = memo(
  ({
    workspacePath,
    onChooseDirectory,
    onSelectWorkspace
  }: {
    onChooseDirectory: () => void;
    onSelectWorkspace: (path: string) => void;
    workspacePath: string;
  }) => {
    const workspace = useWorkspace(workspacePath);
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const { folders } = useWorkspaceFolders({ workspacePath });

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
                    src={workspace.iconDataUrl}
                    alt=""
                    class="size-full rounded-full object-cover"
                    draggable={false}
                  />
                </span>
                <span class="flex min-w-0 flex-1 flex-col justify-center gap-0.5 transition-[opacity,transform] duration-150 ease-out @max-workspace-dock/chat:hidden">
                  <span class="truncate text-sm leading-4 font-medium text-ink">{workspace.folderName}</span>
                  <span class="truncate text-[11px] leading-3 font-medium text-soft">
                    {workspace.branchName ?? workspace.path}
                  </span>
                </span>
                <span aria-hidden="true" class="h-full w-0.5 shrink-0 bg-line @max-workspace-dock/chat:hidden" />
                <span class="grid h-full w-8 shrink-0 place-items-center rounded-r-full text-ink @max-workspace-dock/chat:hidden">
                  <ChevronDownIcon
                    class={cn(
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
              anchor={rootRef}
              side="top"
              align="start"
              sideOffset={8}
              className="z-50"
              collisionPadding={12}
            >
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
  }
);
