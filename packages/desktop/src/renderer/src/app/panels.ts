import type { AppSurface, SidePanelMode } from '@renderer/app/types';
import { useState, useEffect, useCallback } from 'preact/hooks';

interface UseSessionPanelsOptions {
  surface: AppSurface;
  sessionViewActive: boolean;
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
};

const isBracketToggle = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  return event.code === 'BracketRight' || event.key === ']';
};

export const useSessionPanels = ({ surface, sessionViewActive }: UseSessionPanelsOptions) => {
  const [activityTurnId, setActivityTurnId] = useState('');
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>('settings');

  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false);
  }, []);

  const toggleSidePanel = useCallback(() => {
    setSidePanelOpen((open) => !open);
  }, []);

  const openActivityPanel = useCallback((turnId: string) => {
    setActivityTurnId(turnId);
    setSidePanelOpen(true);
    setSidePanelMode('activity');
  }, []);

  const openSettingsPanel = useCallback(() => {
    setSidePanelOpen(true);
    setSidePanelMode('settings');
  }, []);

  const toggleSettingsPanel = useCallback(() => {
    setSidePanelOpen((open) => (sidePanelMode === 'settings' ? !open : true));
    setSidePanelMode('settings');
  }, [sidePanelMode]);

  const toggleGitChangesPanel = useCallback(() => {
    setSidePanelOpen((open) => (sidePanelMode === 'git' ? !open : true));
    setSidePanelMode('git');
  }, [sidePanelMode]);

  useEffect(() => {
    if (surface !== 'main') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape' && sidePanelOpen) {
        event.preventDefault();
        closeSidePanel();
        return;
      }

      if (!isBracketToggle(event) || isEditableTarget(event.target)) return;

      event.preventDefault();
      toggleSidePanel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeSidePanel, sidePanelOpen, surface, toggleSidePanel]);

  const renderedSidePanelMode: SidePanelMode =
    sidePanelMode === 'activity' && (!sessionViewActive || !activityTurnId) ? 'settings' : sidePanelMode;
  const sidePanelVisible = surface === 'main' && sidePanelOpen;
  const gitPanelVisible = sidePanelVisible && renderedSidePanelMode === 'git';
  const settingsPanelVisible = sidePanelVisible && renderedSidePanelMode === 'settings';
  const activityPanelVisible = sidePanelVisible && renderedSidePanelMode === 'activity';

  return {
    activityTurnId,
    sidePanelVisible,
    gitPanelVisible,
    closeSidePanel,
    openSettingsPanel,
    openActivityPanel,
    renderedSidePanelMode,
    settingsPanelVisible,
    activityPanelVisible,
    toggleSettingsPanel,
    toggleGitChangesPanel
  };
};
