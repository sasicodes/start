import type { MobileRelaySettings } from '@preload/index';
import { qrSvg } from '@renderer/shared/settings/utils/qr';

export const mobilePairingPayload = (settings: MobileRelaySettings) =>
  JSON.stringify({
    type: 'start.mobile.relay',
    version: 1,
    desktopId: settings.desktopId,
    relayUrl: settings.relayUrl,
    ...(settings.relayToken ? { relayToken: settings.relayToken } : {})
  });

export const mobilePairingQrSvg = (settings: MobileRelaySettings) =>
  qrSvg(mobilePairingPayload(settings), { ecc: 'medium', margin: 4 });
