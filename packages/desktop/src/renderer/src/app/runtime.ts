import type { AppSettingsResult } from '@preload/index';
import { composerShortcut, keepAwake } from '@renderer/shared/settings/state';
import { useCallback, useEffect, useState } from 'preact/hooks';

export const useRendererRuntime = () => {
  const [solidWindowBackground, setSolidWindowBackground] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const settings = await window.pi.app.settings();
        if (active) {
          keepAwake.value = settings.keepAwake;
          composerShortcut.value = settings.composerShortcut;
          setSolidWindowBackground(settings.solidWindowBackground);
        }
      } catch {
        return;
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.solidWindowBackground = solidWindowBackground ? 'true' : 'false';
  }, [solidWindowBackground]);

  const updateSolidWindowBackground = useCallback(async (enabled: boolean): Promise<AppSettingsResult> => {
    try {
      const result = await window.pi.app.setSolidWindowBackground(enabled);
      if (result.settings) setSolidWindowBackground(result.settings.solidWindowBackground);
      return result;
    } catch {
      return { ok: false, settings: null, error: 'Translucent background could not be saved.' };
    }
  }, []);

  return { solidWindowBackground, updateSolidWindowBackground };
};
