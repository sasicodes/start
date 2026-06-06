import { randomUUID } from 'node:crypto';
import { isRelayUrl, type RelaySocket, wsSocketFactory } from '@main/relay/client';
import { helloDesktopMessage, parseRelayServerMessage } from '@main/relay/protocol';

export interface RelayProbeResult {
  ok: boolean;
}

type ProbeOutcome = 'ok' | 'rejected' | 'unreachable';

const probeTimeoutMs = 5000;
const probeAttempts = 3;

const probeOnce = (relayUrl: string, relayToken: string) =>
  new Promise<ProbeOutcome>((resolve) => {
    let socket: RelaySocket | null = null;
    let settled = false;

    const finish = (outcome: ProbeOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.close();
      resolve(outcome);
    };

    const timer = setTimeout(() => finish('unreachable'), probeTimeoutMs);

    socket = wsSocketFactory(relayUrl, {
      onOpen: () => socket?.send(JSON.stringify(helloDesktopMessage(randomUUID(), relayToken))),
      onClose: () => finish('unreachable'),
      onMessage: (data) => {
        const message = parseRelayServerMessage(data);
        if (message?.type === 'relay.ready') finish('ok');
        if (message?.type === 'relay.error') finish('rejected');
      }
    });
  });

export const probeRelay = async (relayUrl: string, relayToken: string): Promise<RelayProbeResult> => {
  if (!isRelayUrl(relayUrl)) return { ok: false };

  for (let attempt = 0; attempt < probeAttempts; attempt += 1) {
    const outcome = await probeOnce(relayUrl, relayToken);
    if (outcome === 'ok') return { ok: true };
    if (outcome === 'rejected') return { ok: false };
  }

  return { ok: false };
};
