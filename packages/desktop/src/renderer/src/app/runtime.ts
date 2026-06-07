import type { MobileRelaySettings } from '@preload/index';
import { composerShortcut, keepAwake } from '@renderer/shared/settings/state';
import { useCallback, useEffect, useState } from 'preact/hooks';

const emptyMobileRelaySettings = {
  enabled: false,
  desktopId: '',
  relayUrl: '',
  relayToken: ''
} satisfies MobileRelaySettings;

export const useRendererRuntime = () => {
  const [mobileRelay, setMobileRelay] = useState<MobileRelaySettings>(emptyMobileRelaySettings);
  const [solidWindowBackground, setSolidWindowBackground] = useState(false);

  useEffect(() => {
    let active = true;

    window.pi.app
      .settings()
      .then((settings) => {
        if (active) {
          keepAwake.value = settings.keepAwake;
          composerShortcut.value = settings.composerShortcut;
          setMobileRelay(settings.mobileRelay);
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

  const updateMobileRelay = useCallback(async (settings: MobileRelaySettings) => {
    const result = await window.pi.app.setMobileRelaySettings(settings);
    if (result.settings) setMobileRelay(result.settings.mobileRelay);
    return result;
  }, []);

  const updateSolidWindowBackground = useCallback(async (enabled: boolean) => {
    const result = await window.pi.app.setSolidWindowBackground(enabled);
    if (result.settings) setSolidWindowBackground(result.settings.solidWindowBackground);
    return result;
  }, []);

  return { mobileRelay, solidWindowBackground, updateMobileRelay, updateSolidWindowBackground };
};
