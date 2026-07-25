import type { WorkspaceFolder } from '@preload/index';
import { visibleAttentionStatus } from '@renderer/shared/attention';
import { Indicator } from '@renderer/shared/indicator';
import { FolderIcon } from '@renderer/ui/icons';
import { AppMenu } from '@renderer/ui/menu';
import { tw } from '@renderer/utils/tw';

const WorkspaceAttention = ({ folder }: { folder: WorkspaceFolder }) => {
  const attention = visibleAttentionStatus(folder.active, folder.status, folder.noticeKind);
  if (!attention) return null;
  return (
    <span class="flex h-5 items-center">
      <Indicator kind={attention} />
    </span>
  );
};

interface WorkspaceRowProps {
  selected: boolean;
  folder: WorkspaceFolder;
  onSelect: (path: string) => void;
}

interface WorkspaceMenuProps {
  folders: WorkspaceFolder[];
  onChooseDirectory: () => void;
  onSelect: (path: string) => void;
}

const WorkspaceRow = ({ folder, selected, onSelect }: WorkspaceRowProps) => (
  <AppMenu.Item
    disabled={selected}
    onClick={() => onSelect(folder.path)}
    className={tw(
      'grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
      selected ? 'bg-control text-hover' : 'bg-transparent'
    )}
  >
    <span class="flex min-w-0 flex-col gap-0.5">
      <span class="truncate text-sm leading-5 font-medium">{folder.name}</span>
      <span class="truncate text-left text-xs leading-4 font-normal text-soft">{folder.path}</span>
    </span>
    <WorkspaceAttention folder={folder} />
  </AppMenu.Item>
);

export const WorkspaceMenu = ({ folders, onSelect, onChooseDirectory }: WorkspaceMenuProps) => (
  <div class="flex max-h-[min(520px,var(--available-height))] min-h-0 flex-col gap-1">
    <div class="flex min-h-0 flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      {folders.map((folder) => (
        <WorkspaceRow key={folder.path} folder={folder} onSelect={onSelect} selected={folder.active} />
      ))}
    </div>
    <AppMenu.Item
      onClick={onChooseDirectory}
      className="grid w-full flex-none grid-cols-[auto_1fr] items-center gap-2 rounded-xl px-3 py-3 text-left text-sm leading-5 font-medium text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control"
    >
      <FolderIcon class="size-4.5" />
      <span>Choose a directory</span>
    </AppMenu.Item>
  </div>
);
