import { useCallback, useEffect, useState } from 'preact/hooks';

export const useRendererRuntime = () => {
  const [composerShortcut, setComposerShortcut] = useState('Control+Space');
  const [solidWindowBackground, setSolidWindowBackground] = useState(false);

  useEffect(() => {
    let active = true;

    void window.pi.app
      .settings()
      .then((settings) => {
        if (active) {
          setComposerShortcut(settings.composerShortcut);
          setSolidWindowBackground(settings.solidWindowBackground);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.solidWindowBackground = solidWindowBackground ? 'true' : 'false';
  }, [solidWindowBackground]);

  const updateComposerShortcut = useCallback(async (shortcut: string) => {
    const result = await window.pi.app.setComposerShortcut(shortcut);
    if (result.settings) setComposerShortcut(result.settings.composerShortcut);
    return result;
  }, []);

  const updateSolidWindowBackground = useCallback(async (enabled: boolean) => {
    const result = await window.pi.app.setSolidWindowBackground(enabled);
    if (result.settings) setSolidWindowBackground(result.settings.solidWindowBackground);
    return result;
  }, []);

  return {
    composerShortcut,
    solidWindowBackground,
    updateComposerShortcut,
    updateSolidWindowBackground
  };
};
