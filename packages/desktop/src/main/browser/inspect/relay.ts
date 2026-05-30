import { sendToRendererWindows } from '@main/window';

export interface InspectRelay<TPayload = unknown> {
  event: string;
  payload: TPayload;
}

const relayPrefix = '__startInspect__:';

export const parseInspectRelay = <TPayload = unknown>(message: string): InspectRelay<TPayload> | null => {
  if (!message.startsWith(relayPrefix)) return null;
  try {
    const parsed = JSON.parse(message.slice(relayPrefix.length)) as Partial<InspectRelay<TPayload>>;
    if (typeof parsed?.event !== 'string') return null;
    return { event: parsed.event, payload: parsed.payload as TPayload };
  } catch {
    return null;
  }
};

export const resolveInspectRelay = <TPayload = unknown>(
  active: boolean,
  message: string
): InspectRelay<TPayload> | null => (active ? parseInspectRelay<TPayload>(message) : null);

export const routeInspectRelay = (message: InspectRelay) => {
  if (message.event === 'mode-changed') {
    const payload = message.payload as { active?: boolean } | undefined;
    sendToRendererWindows('app:browser-inspect-state', Boolean(payload?.active));
    return;
  }

  if (message.event === 'annotations-sent') {
    const payload = message.payload as { text?: string } | undefined;
    if (payload?.text) sendToRendererWindows('app:browser-inspect-sent', payload.text);
  }
};
