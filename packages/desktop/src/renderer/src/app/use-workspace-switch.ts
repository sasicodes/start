import type { useAppNavigation } from '@renderer/app/navigation';
import type { useChat } from '@renderer/shared/chat/use-chat';
import { canSelectWorkspace } from '@renderer/shared/workspace/select';
import { useCallback, useState } from 'preact/hooks';

interface WorkspaceSwitchOptions
  extends Pick<ReturnType<typeof useChat>, 'workspacePath' | 'switchWorkspace' | 'chooseWorkspaceDirectory'>,
    Pick<ReturnType<typeof useAppNavigation>, 'surface' | 'navigate'> {
  closeSidePanel: () => void;
}

export const useWorkspaceSwitch = ({
  surface,
  navigate,
  workspacePath,
  closeSidePanel,
  switchWorkspace,
  chooseWorkspaceDirectory
}: WorkspaceSwitchOptions) => {
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  const showSwitchedWorkspace = useCallback(
    async (switcher: () => Promise<boolean>) => {
      closeSidePanel();
      setSwitchingWorkspace(true);
      navigate({ name: 'chat' }, true);
      try {
        await switcher();
      } finally {
        setSwitchingWorkspace(false);
      }
    },
    [closeSidePanel, navigate]
  );

  const chooseWorkspaceFromComposer = useCallback(
    () => showSwitchedWorkspace(() => chooseWorkspaceDirectory({ preserveDraft: surface === 'composer' })),
    [chooseWorkspaceDirectory, showSwitchedWorkspace, surface]
  );

  const selectWorkspaceFromComposer = useCallback(
    (path: string) => {
      if (!canSelectWorkspace(path, workspacePath)) return;

      showSwitchedWorkspace(() => switchWorkspace(path, { preserveDraft: true }));
    },
    [workspacePath, switchWorkspace, showSwitchedWorkspace]
  );

  const chooseWorkspaceFromDock = useCallback(
    () => showSwitchedWorkspace(chooseWorkspaceDirectory),
    [chooseWorkspaceDirectory, showSwitchedWorkspace]
  );

  const selectWorkspaceFromDock = useCallback(
    (path: string) => {
      if (!canSelectWorkspace(path, workspacePath)) return;

      showSwitchedWorkspace(() => switchWorkspace(path));
    },
    [workspacePath, switchWorkspace, showSwitchedWorkspace]
  );

  return {
    switchingWorkspace,
    chooseWorkspaceFromDock,
    selectWorkspaceFromDock,
    chooseWorkspaceFromComposer,
    selectWorkspaceFromComposer
  };
};
