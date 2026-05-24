import type { WorkspaceFolder } from '@preload/index';
import { FolderIcon } from '@renderer/ui/icons';
import { AppMenu } from '@renderer/ui/menu';
import { NoticeDot } from '@renderer/ui/notice-dot';
import { tw } from '@renderer/utils/tw';

const WorkspaceOption = ({
  folder,
  selected,
  onSelectWorkspace
}: {
  selected: boolean;
  folder: WorkspaceFolder;
  onSelectWorkspace: (path: string) => void;
}) => (
  <AppMenu.Item
    onClick={() => onSelectWorkspace(folder.path)}
    className={tw(
      'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
      selected ? 'bg-control text-hover' : 'bg-transparent'
    )}
  >
    <span class="flex min-w-0 flex-col gap-0.5">
      <span class="truncate text-sm leading-5 font-medium">{folder.name}</span>
      <span class="truncate text-xs leading-4 font-normal text-soft">{folder.path}</span>
    </span>
    {folder.noticeKind && <NoticeDot />}
  </AppMenu.Item>
);

export const WorkspaceMenu = ({
  folders,
  workspacePath,
  onChooseDirectory,
  onSelectWorkspace
}: {
  folders: WorkspaceFolder[];
  workspacePath?: string;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
}) => (
  <div class="flex flex-col gap-1">
    {folders.map((folder) => (
      <WorkspaceOption
        key={folder.path}
        folder={folder}
        selected={folder.path === workspacePath}
        onSelectWorkspace={onSelectWorkspace}
      />
    ))}
    <AppMenu.Item
      onClick={onChooseDirectory}
      className="grid w-full grid-cols-[auto_1fr] items-center gap-2 rounded-xl px-3 py-3 text-left text-sm leading-5 font-medium text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control"
    >
      <FolderIcon class="size-4.5" />
      <span class="text-xs leading-5">Choose a directory</span>
    </AppMenu.Item>
  </div>
);
