import type { MobileRelaySettings } from '@preload/index';
import qrcode from 'qrcode-generator';

export const mobilePairingPayload = (settings: MobileRelaySettings) =>
  JSON.stringify({
    type: 'start.mobile.relay',
    version: 1,
    desktopId: settings.desktopId,
    relayUrl: settings.relayUrl,
    ...(settings.relayToken ? { relayToken: settings.relayToken } : {})
  });

export const mobilePairingQrSvg = (settings: MobileRelaySettings) => {
  const qr = qrcode(0, 'M');
  qr.addData(mobilePairingPayload(settings), 'Byte');
  qr.make();
  return qr.createSvgTag({ cellSize: 5, margin: 4, scalable: true });
};
