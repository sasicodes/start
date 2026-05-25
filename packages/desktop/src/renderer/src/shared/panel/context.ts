import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

interface PanelMotion {
  moving: boolean;
}

const panelMotionContext = createContext<PanelMotion>({ moving: false });

export const PanelMotionProvider = panelMotionContext.Provider;

export const usePanelMotion = () => useContext(panelMotionContext);
