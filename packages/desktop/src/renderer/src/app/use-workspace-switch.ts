import type { useAppNavigation } from '@renderer/app/navigation';
import type { useChat } from '@renderer/shared/chat/use-chat';
import { canSelectWorkspace } from '@renderer/shared/workspace/select';
import { useCallback, useRef, useState } from 'preact/hooks';

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
  const requestRef = useRef(0);
  const pendingPathRef = useRef('');
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  const showSwitchedWorkspace = useCallback(
    async (switcher: () => Promise<boolean>, path = '') => {
      if (path && pendingPathRef.current === path) return;

      const request = requestRef.current + 1;
      requestRef.current = request;
      pendingPathRef.current = path;
      closeSidePanel();
      setSwitchingWorkspace(true);
      navigate({ name: 'chat' }, true);
      try {
        await switcher();
      } finally {
        if (requestRef.current === request) {
          pendingPathRef.current = '';
          setSwitchingWorkspace(false);
        }
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

      showSwitchedWorkspace(() => switchWorkspace(path, { preserveDraft: true }), path);
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

      showSwitchedWorkspace(() => switchWorkspace(path), path);
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
