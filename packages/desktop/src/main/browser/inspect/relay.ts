import { sendToRendererWindows } from '@main/window';
import * as v from 'valibot';

const relaySchema = v.variant('event', [
  v.object({
    event: v.literal('mode-changed'),
    payload: v.object({ active: v.boolean() })
  }),
  v.object({
    event: v.literal('annotations-sent'),
    payload: v.object({
      text: v.pipe(v.string(), v.maxLength(64 * 1024)),
      count: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
    })
  })
]);

export type InspectRelay = v.InferOutput<typeof relaySchema>;

const relayPrefix = '__startInspect__:';

export const parseInspectRelay = (message: string): InspectRelay | null => {
  if (message.length > 512 * 1024 || !message.startsWith(relayPrefix)) return null;
  try {
    const parsed = v.safeParse(relaySchema, JSON.parse(message.slice(relayPrefix.length)));
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
};

export const resolveInspectRelay = (active: boolean, message: string): InspectRelay | null =>
  active ? parseInspectRelay(message) : null;

export const routeInspectRelay = (message: InspectRelay) => {
  if (message.event === 'mode-changed') {
    sendToRendererWindows('app:browser-inspect-state', message.payload.active);
    return;
  }

  if (message.payload.text) sendToRendererWindows('app:browser-inspect-sent', message.payload.text);
};
