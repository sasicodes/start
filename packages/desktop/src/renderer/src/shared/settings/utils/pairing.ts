import type { MobileRelaySettings } from '@preload/index';
import { qrSvg } from '@renderer/shared/settings/utils/qr';

export const mobilePairingPayload = (settings: MobileRelaySettings, code = '') =>
  JSON.stringify({
    type: 'start.mobile.relay',
    version: 1,
    desktopId: settings.desktopId,
    relayUrl: settings.relayUrl,
    ...(code ? { code } : {}),
    ...(settings.relayToken ? { relayToken: settings.relayToken } : {})
  });

export const mobilePairingQrSvg = (settings: MobileRelaySettings, code = '') =>
  qrSvg(mobilePairingPayload(settings, code), { ecc: 'high', margin: 3 });
