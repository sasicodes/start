import type { WorkspaceFolder } from '@preload/index';
import { FolderIcon } from '@renderer/ui/icons';
import { AppMenu, MenuPanel, type MenuPanelWidth } from '@renderer/ui/menu';
import { tw } from '@renderer/utils/tw';

const WorkspaceOption = ({
  folder,
  selected,
  onSelectWorkspace
}: {
  folder: WorkspaceFolder;
  selected: boolean;
  onSelectWorkspace: (path: string) => void;
}) => (
  <AppMenu.Item
    closeOnClick
    onClick={() => onSelectWorkspace(folder.path)}
    className={tw(
      'grid w-full gap-0.5 rounded-xl px-3 py-2 text-left text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control',
      selected ? 'bg-control text-hover' : 'bg-transparent'
    )}
  >
    <span class="truncate text-sm leading-5 font-medium">{folder.name}</span>
    <span class="truncate text-xs leading-4 font-normal text-soft">{folder.path}</span>
  </AppMenu.Item>
);

export const WorkspaceMenu = ({
  folders,
  panelWidth,
  workspacePath,
  onChooseDirectory,
  onSelectWorkspace
}: {
  folders: WorkspaceFolder[];
  panelWidth: MenuPanelWidth;
  workspacePath: string | undefined;
  onChooseDirectory: () => void;
  onSelectWorkspace: (path: string) => void;
}) => (
  <MenuPanel width={panelWidth}>
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
        closeOnClick
        onClick={onChooseDirectory}
        className="grid w-full grid-cols-[auto_1fr] items-center gap-2 rounded-xl px-3 py-3 text-left text-sm leading-5 font-medium text-ink outline-0 transition-colors select-none data-[highlighted]:bg-control"
      >
        <FolderIcon class="size-4.5" />
        <span class="text-xs leading-5">Choose a directory</span>
      </AppMenu.Item>
    </div>
  </MenuPanel>
);
