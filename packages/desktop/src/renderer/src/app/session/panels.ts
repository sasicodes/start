import type { AppSurface } from '@renderer/app/types';
import { type SidePanelState, toggledSidePanel } from '@renderer/app/utils/panel';
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
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('personalization');
  const [sidePanel, setSidePanel] = useState<SidePanelState>({ open: false, mode: 'browser' });

  const closeSidePanel = useCallback(() => {
    setSidePanel((state) => ({ ...state, open: false }));
  }, []);

  const toggleBrowserPanel = useCallback(() => {
    playToggleSound();
    setSidePanel((state) => toggledSidePanel(state, 'browser'));
  }, []);

  const openSettingsPanel = useCallback((tab: SettingsTab = 'personalization') => {
    setSidePanel({ open: true, mode: 'settings' });
    setSettingsTab(tab);
  }, []);

  const toggleSettingsPanel = useCallback(
    (tab: SettingsTab = 'personalization') => {
      playToggleSound();
      setSidePanel((state) => toggledSidePanel(state, 'settings', state.mode === 'settings' && settingsTab === tab));
      setSettingsTab(tab);
    },
    [settingsTab]
  );

  const openBrowserPanel = useCallback(() => {
    setSidePanel({ open: true, mode: 'browser' });
    selectBrowser();
  }, []);

  const toggleGitChangesPanel = useCallback(() => {
    playToggleSound();
    setSidePanel((state) =>
      toggledSidePanel(state, 'browser', state.mode === 'browser' && panelTabs.peek().selected === 'review')
    );
    openReview();
  }, []);

  const sidePanelMode = sidePanel.mode;
  const sidePanelVisible = surface === 'main' && sidePanel.open;
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

      if (event.key === 'Escape' && sidePanel.open) {
        event.preventDefault();
        playToggleSound();
        closeSidePanel();
        return;
      }

      if (!isBracketToggle(event) || isEditableTarget(event.target)) return;

      event.preventDefault();
      toggleBrowserPanel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeSidePanel, sidePanel.open, surface, toggleBrowserPanel]);

  return {
    settingsTab,
    sidePanelMode,
    setSettingsTab,
    closeSidePanel,
    gitPanelVisible,
    sidePanelVisible,
    openBrowserPanel,
    openSettingsPanel,
    toggleSettingsPanel,
    settingsPanelVisible,
    toggleGitChangesPanel
  };
};
