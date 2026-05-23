import type { WorkspaceInfo } from '@preload/index';
import { cachedWorkspace, rememberWorkspace } from '@renderer/shared/workspace/cache';
import { useEffect, useMemo, useState } from 'preact/hooks';

export const useWorkspace = (refreshKey: string | undefined) => {
  const fallbackWorkspace = useMemo(() => cachedWorkspace(refreshKey), [refreshKey]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(fallbackWorkspace);

  useEffect(() => {
    let active = true;

    if (!refreshKey) {
      setWorkspace(null);
      return () => {
        active = false;
      };
    }

    setWorkspace((current) => (current?.path === refreshKey ? current : fallbackWorkspace));
    void window.pi.app
      .workspace(refreshKey)
      .then(rememberWorkspace)
      .then((nextWorkspace) => {
        if (active) setWorkspace(nextWorkspace);
      })
      .catch(() => {
        if (active) setWorkspace(fallbackWorkspace);
      });

    const stopWorkspaceChanged = window.pi.app.onWorkspaceChanged((nextWorkspace) => {
      rememberWorkspace(nextWorkspace);
      if (active && nextWorkspace.path === refreshKey) setWorkspace(nextWorkspace);
    });

    return () => {
      active = false;
      stopWorkspaceChanged();
    };
  }, [fallbackWorkspace, refreshKey]);

  return workspace?.path === refreshKey ? workspace : fallbackWorkspace;
};
