import { useWorkspace } from '@renderer/shared/use-workspace';
import { CommonTooltip } from '@renderer/ui/tooltip';

export const Workspace = () => {
  const workspace = useWorkspace();
  if (!workspace) return null;

  return (
    <CommonTooltip label={workspace.folderName}>
      <div
        role="img"
        aria-label={`Current workspace ${workspace.folderName}`}
        class="absolute right-4.5 bottom-4.5 z-40 flex h-11.5 max-w-56 min-w-0 items-center gap-2 rounded-full bg-composer px-1.5 pr-4 text-soft shadow-shell select-none [-webkit-app-region:no-drag]"
      >
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
      </div>
    </CommonTooltip>
  );
};
