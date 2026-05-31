import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { attentionStatus, topAttentionStatus } from '@renderer/shared/attention-status';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel } from '@renderer/ui/menu';
import { Indicator } from '@renderer/shared/indicator';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useRef, useState } from 'preact/hooks';

export const Workspace = memo(
  ({
    collapsed,
    workspacePath,
    onSelectWorkspace,
    onChooseDirectory
  }: {
    collapsed: boolean;
    workspacePath: string;
    onChooseDirectory: () => void;
    onSelectWorkspace: (path: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const workspace = useWorkspace(workspacePath);
    const { folders } = useWorkspaceFolders({ workspacePath });
    const attention = topAttentionStatus(
      folders
        .filter((folder) => folder.path !== workspacePath)
        .map((folder) => attentionStatus(folder.status, folder.noticeKind))
    );

    const updateOpen = useCallback((nextOpen: boolean) => {
      setOpen(nextOpen);
    }, []);

    if (!workspace) return null;

    const tooltipLabel = workspace.branchName
      ? `${workspace.folderName} (${workspace.branchName})`
      : workspace.folderName;

    return (
      <div
        ref={rootRef}
        class={tw(
          'h-11.5 text-soft transition-[width] duration-150 ease-out select-none',
          collapsed ? 'w-11.5' : 'w-64 max-w-[calc(100vw-2.25rem)] @max-workspace-dock/chat:size-11.5'
        )}
      >
        <AppMenu.Root open={open} onOpenChange={updateOpen}>
          <Tooltip label={tooltipLabel} disabled={open}>
            <div class="block h-full w-full rounded-full">
              <AppMenu.Trigger
                aria-label="Workspace folders"
                className={tw(
                  'relative flex h-full w-full min-w-0 items-center overflow-hidden rounded-full border-0 bg-composer text-left text-soft shadow-shell outline-0 transition-[background-color,padding] duration-150 ease-out hover:bg-control focus-visible:bg-control',
                  collapsed
                    ? 'justify-center gap-0 p-1.75'
                    : 'gap-2 pr-1.5 pl-1.5 @max-workspace-dock/chat:justify-center @max-workspace-dock/chat:gap-0 @max-workspace-dock/chat:p-1.75'
                )}
              >
                <span class="grid size-8 flex-none place-items-center overflow-hidden rounded-full bg-white">
                  <img
                    alt=""
                    src={workspace.iconDataUrl}
                    draggable={false}
                    class="size-full rounded-full object-cover"
                  />
                </span>
                <span
                  class={tw(
                    'flex min-w-0 flex-1 flex-col justify-center gap-0.5 transition-[opacity,transform] duration-150 ease-out @max-workspace-dock/chat:hidden',
                    collapsed && 'hidden'
                  )}
                >
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="truncate text-sm leading-4 font-medium text-ink">{workspace.folderName}</span>
                  </span>
                  <span class="truncate text-[11px] leading-3 font-medium text-soft">
                    {workspace.branchName ?? workspace.path}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  class={tw('h-full w-0.5 shrink-0 bg-line @max-workspace-dock/chat:hidden', collapsed && 'hidden')}
                />
                <span
                  class={tw(
                    'grid h-full w-8 shrink-0 place-items-center rounded-r-full text-ink @max-workspace-dock/chat:hidden',
                    collapsed && 'hidden'
                  )}
                >
                  <ChevronDownIcon
                    class={tw(
                      'size-4 -translate-x-px transition-transform duration-150 ease-out',
                      open && 'rotate-180'
                    )}
                  />
                </span>
                {attention && (
                  <span class="pointer-events-none absolute top-[3px] right-[3px] z-10">
                    <Indicator kind={attention} />
                  </span>
                )}
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
