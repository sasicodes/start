import type { WorkspaceInfo } from '@preload/index';
import { useEffect, useState } from 'preact/hooks';

export const useWorkspace = (refreshKey: string | undefined) => {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    let active = true;

    if (!refreshKey) {
      setWorkspace(null);
      return () => {
        active = false;
      };
    }

    void window.pi.app.workspace(refreshKey).then((nextWorkspace) => {
      if (active) setWorkspace(nextWorkspace);
    });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  return workspace;
};
