import type { AppSurface, SidePanelMode } from '@renderer/app/types';
import { useCallback, useState } from 'preact/hooks';

export const useSessionPanels = ({
  sessionViewActive,
  surface
}: {
  sessionViewActive: boolean;
  surface: AppSurface;
}) => {
  const [activityTurnId, setActivityTurnId] = useState('');
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>('');

  const clearSidePanels = useCallback(() => {
    setActivityTurnId('');
    setSidePanelMode('');
  }, []);

  const openActivityPanel = useCallback((turnId: string) => {
    setActivityTurnId(turnId);
    setSidePanelMode('activity');
  }, []);

  const toggleGitChangesPanel = useCallback(() => {
    setActivityTurnId('');
    setSidePanelMode((current) => (current === 'git' ? '' : 'git'));
  }, []);

  const activityPanelVisible =
    surface === 'main' && sessionViewActive && sidePanelMode === 'activity' && Boolean(activityTurnId);
  const gitPanelVisible = surface === 'main' && sessionViewActive && sidePanelMode === 'git';

  return {
    activityTurnId,
    gitPanelVisible,
    clearSidePanels,
    sidePanelMode,
    setActivityTurnId,
    setSidePanelMode,
    openActivityPanel,
    activityPanelVisible,
    toggleGitChangesPanel
  };
};
