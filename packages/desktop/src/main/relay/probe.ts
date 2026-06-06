import { randomUUID } from 'node:crypto';
import { isRelayUrl } from '@main/relay/client';
import { helloDesktopMessage, parseRelayServerMessage } from '@main/relay/protocol';
import { WebSocket } from 'ws';

export interface RelayProbeResult {
  ok: boolean;
}

type ProbeOutcome = 'ok' | 'rejected' | 'unreachable';

const probeTimeoutMs = 5000;
const probeAttempts = 3;

const probeOnce = (relayUrl: string, relayToken: string) =>
  new Promise<ProbeOutcome>((resolve) => {
    const socket = new WebSocket(relayUrl);
    let settled = false;

    const finish = (outcome: ProbeOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      resolve(outcome);
    };

    const timer = setTimeout(() => finish('unreachable'), probeTimeoutMs);

    socket.on('open', () => socket.send(JSON.stringify(helloDesktopMessage(randomUUID(), relayToken))));
    socket.on('message', (data) => {
      const message = parseRelayServerMessage(data.toString());
      if (message?.type === 'relay.ready') finish('ok');
      if (message?.type === 'relay.error') finish('rejected');
    });
    socket.on('error', () => finish('unreachable'));
    socket.on('close', () => finish('unreachable'));
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
