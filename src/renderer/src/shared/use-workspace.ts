import type { WorkspaceInfo } from '@preload/index';
import { useEffect, useState } from 'preact/hooks';

export const useWorkspace = () => {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    let active = true;

    void window.pi.app.workspace().then((nextWorkspace) => {
      if (active) setWorkspace(nextWorkspace);
    });

    return () => {
      active = false;
    };
  }, []);

  return workspace;
};
