import type { AppSurface, SidePanelMode } from '@renderer/app/types';
import { openReview, panelTabs, selectBrowser } from '@renderer/shared/browser/state';
import type { SettingsTab } from '@renderer/shared/settings/tab';
import { playToggleSound } from '@renderer/ui/sounds';
import { isEditableTarget } from '@renderer/utils/dom';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface SessionPanelsOptions {
  surface: AppSurface;
}

const isBracketToggle = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  return event.code === 'BracketRight' || event.key === ']';
};

export const useSessionPanels = ({ surface }: SessionPanelsOptions) => {
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>('settings');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('personalization');

  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false);
  }, []);

  const toggleSidePanel = useCallback(() => {
    setSidePanelOpen((open) => !open);
  }, []);

  const openSettingsPanel = useCallback((tab: SettingsTab = 'personalization') => {
    setSidePanelOpen(true);
    setSidePanelMode('settings');
    setSettingsTab(tab);
  }, []);

  const openShortcutsPanel = useCallback(() => {
    openSettingsPanel('shortcuts');
  }, [openSettingsPanel]);

  const openBrowserPanel = useCallback(() => {
    setSidePanelOpen(true);
    setSidePanelMode('browser');
    selectBrowser();
  }, []);

  const toggleSettingsPanel = useCallback(() => {
    setSidePanelOpen((open) => (sidePanelMode === 'settings' ? !open : true));
    setSidePanelMode('settings');
  }, [sidePanelMode]);

  const toggleGitChangesPanel = useCallback(() => {
    const reviewing = sidePanelMode === 'browser' && panelTabs.peek().selected === 'review';
    setSidePanelOpen((open) => (reviewing ? !open : true));
    setSidePanelMode('browser');
    openReview();
  }, [sidePanelMode]);

  const sidePanelVisible = surface === 'main' && sidePanelOpen;
  const gitPanelVisible = sidePanelVisible && sidePanelMode === 'browser' && panelTabs.value.selected === 'review';
  const settingsPanelVisible = sidePanelVisible && sidePanelMode === 'settings';

  useEffect(() => {
    window.pi.app.setSidePanelOpen(sidePanelVisible);
  }, [sidePanelVisible]);

  useEffect(() => {
    if (!settingsPanelVisible) return;
    return window.pi.app.onClosePanelTab(closeSidePanel);
  }, [closeSidePanel, settingsPanelVisible]);

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
      playToggleSound();
      toggleSidePanel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeSidePanel, sidePanelOpen, surface, toggleSidePanel]);

  return {
    settingsTab,
    sidePanelMode,
    setSettingsTab,
    closeSidePanel,
    gitPanelVisible,
    sidePanelVisible,
    openBrowserPanel,
    openSettingsPanel,
    openShortcutsPanel,
    settingsPanelVisible,
    toggleSettingsPanel,
    toggleGitChangesPanel
  };
};
