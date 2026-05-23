import { useWorkspace } from '@renderer/shared/workspace/info';
import { WorkspaceMenu } from '@renderer/shared/workspace/menu';
import { useWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { AppMenu } from '@renderer/ui/menu';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { cn } from '@renderer/utils/cn';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const collapsedWorkspaceBadgeWidth = 46;

export const Workspace = ({
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
  const [collapsed, setCollapsed] = useState(false);
  const { folders, refreshFolders } = useWorkspaceFolders({ active: open, workspacePath });

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) refreshFolders();
    },
    [refreshFolders]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      const nextCollapsed = entry.contentRect.width <= collapsedWorkspaceBadgeWidth;
      setCollapsed((current) => (current === nextCollapsed ? current : nextCollapsed));
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  if (!workspace) return null;

  return (
    <div
      ref={rootRef}
      class="h-11.5 w-64 max-w-[calc(100vw-2.25rem)] text-soft transition-[width] duration-150 ease-out select-none @max-workspace-dock/chat:size-11.5"
    >
      <AppMenu.Root open={open} onOpenChange={updateOpen}>
        <CommonTooltip label={workspace.folderName} disabled={!collapsed}>
          <AppMenu.Trigger
            aria-label="Workspace folders"
            className="flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-full border-0 bg-composer py-1.5 pr-3 pl-1.5 text-left text-soft shadow-shell outline-0 transition-[background-color,padding] duration-150 ease-out hover:bg-control focus-visible:bg-control @max-workspace-dock/chat:justify-center @max-workspace-dock/chat:gap-0 @max-workspace-dock/chat:p-1.75"
          >
            <span class="grid size-8 flex-none place-items-center overflow-hidden rounded-full bg-white">
              <img src={workspace.iconDataUrl} alt="" class="size-full rounded-full object-cover" draggable={false} />
            </span>
            <span class="flex min-w-0 flex-1 flex-col justify-center gap-0.5 transition-[opacity,transform] duration-150 ease-out @max-workspace-dock/chat:hidden">
              <span class="truncate text-sm leading-4 font-medium text-ink">{workspace.folderName}</span>
              <span class="truncate text-[11px] leading-3 font-medium text-soft">
                {workspace.branchName ?? workspace.path}
              </span>
            </span>
            <ChevronDownIcon
              class={cn(
                'size-4 shrink-0 text-ink transition-[opacity,transform] duration-150 ease-out @max-workspace-dock/chat:hidden',
                open && 'rotate-180'
              )}
            />
          </AppMenu.Trigger>
        </CommonTooltip>
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
};
