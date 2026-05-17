import { useWorkspace } from '@renderer/shared/use-workspace';
import { ChevronDownIcon } from '@renderer/ui/icons';

export const Workspace = () => {
  const workspace = useWorkspace();
  if (!workspace) return null;

  return (
    <div
      role="img"
      aria-label={`Current workspace ${workspace.folderName}`}
      class="flex h-11.5 max-w-64 min-w-0 items-center gap-px text-soft shadow-shell select-none"
    >
      <span class="flex h-full min-w-0 items-center gap-2 rounded-[23px_3px_3px_23px] bg-composer py-1.5 pr-3 pl-1.5">
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
      <span class="grid size-11.5 flex-none place-items-center rounded-[3px_23px_23px_3px] bg-composer text-ink transition-colors hover:bg-control">
        <ChevronDownIcon class="-ml-px size-4" />
      </span>
    </div>
  );
};
