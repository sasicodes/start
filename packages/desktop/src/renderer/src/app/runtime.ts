import { useCallback, useEffect, useState } from 'preact/hooks';

export const useRendererRuntime = () => {
  const [debugToolbarVisible, setDebugToolbarVisible] = useState(false);
  const [composerShortcut, setComposerShortcut] = useState('Control+Space');

  useEffect(() => {
    let active = true;

    void window.pi.app
      .settings()
      .then((settings) => {
        if (active) setComposerShortcut(settings.composerShortcut);
      })
      .catch(() => {});
    void window.pi.app
      .runtime()
      .then((runtime) => {
        if (active) setDebugToolbarVisible(runtime.debugToolbar);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const updateComposerShortcut = useCallback(async (shortcut: string) => {
    const result = await window.pi.app.setComposerShortcut(shortcut);
    if (result.settings) setComposerShortcut(result.settings.composerShortcut);
    return result;
  }, []);

  return {
    composerShortcut,
    debugToolbarVisible,
    updateComposerShortcut
  };
};
