import * as v from 'valibot';

const relayReadySchema = v.object({
  type: v.literal('relay.ready'),
  role: v.optional(v.string())
});

const relayErrorSchema = v.object({
  type: v.literal('relay.error'),
  message: v.string()
});

const pairingCreatedSchema = v.object({
  type: v.literal('pairing.created'),
  code: v.string(),
  expiresAt: v.number()
});

const pairingRequestSchema = v.object({
  type: v.literal('pairing.request'),
  code: v.string(),
  mobileId: v.string(),
  name: v.optional(v.string()),
  publicKey: v.optional(v.string())
});

const mobileDisconnectedSchema = v.object({
  type: v.literal('mobile.disconnected'),
  mobileId: v.string()
});

const relayCommandSchema = v.object({
  value: v.string(),
  action: v.string()
});

const requestIdSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120));
const relayTextSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(20000));
const relayPathSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(4096));
const relaySessionIdSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(512));
const relayPageLimitSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50));
const relayPageOffsetSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(10000));

const sessionsListCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('sessions.list'),
  limit: v.optional(relayPageLimitSchema),
  offset: v.optional(relayPageOffsetSchema),
  archived: v.optional(v.boolean()),
  workspacePath: v.optional(relayPathSchema)
});

const messagesPageCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('messages.page'),
  sessionId: relaySessionIdSchema,
  limit: v.optional(relayPageLimitSchema),
  offset: v.optional(relayPageOffsetSchema)
});

const messageSendCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('message.send'),
  text: relayTextSchema,
  sessionId: v.optional(relaySessionIdSchema),
  workspacePath: v.optional(relayPathSchema)
});

const sessionArchiveCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('session.archive'),
  sessionId: relaySessionIdSchema
});

const sessionRenameCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('session.rename'),
  sessionId: relaySessionIdSchema,
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))
});

const modelsListCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('models.list')
});

const modelSelectCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('model.select'),
  modelKey: relaySessionIdSchema
});

const thinkingSelectCommandSchema = v.object({
  type: v.optional(v.string()),
  requestId: requestIdSchema,
  action: v.literal('thinking.select'),
  level: relaySessionIdSchema
});

const mobileRelayCommandSchema = v.union([
  relayCommandSchema,
  sessionsListCommandSchema,
  messagesPageCommandSchema,
  messageSendCommandSchema,
  sessionArchiveCommandSchema,
  sessionRenameCommandSchema,
  modelsListCommandSchema,
  modelSelectCommandSchema,
  thinkingSelectCommandSchema
]);

const mobileCommandSchema = v.object({
  type: v.literal('mobile.command'),
  mobileId: v.string(),
  payload: mobileRelayCommandSchema
});

const serverMessageSchema = v.union([
  relayReadySchema,
  relayErrorSchema,
  pairingCreatedSchema,
  pairingRequestSchema,
  mobileDisconnectedSchema,
  mobileCommandSchema
]);

export type MobileRelayCommand = v.InferOutput<typeof mobileRelayCommandSchema>;
export type RelayServerMessage = v.InferOutput<typeof serverMessageSchema>;
export type DesktopRelayEventPayload = Record<string, unknown>;

export const parseRelayServerMessage = (raw: string): RelayServerMessage | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return;
  }
  const result = v.safeParse(serverMessageSchema, value);
  if (result.success) return result.output;
  return;
};

export const helloDesktopMessage = (desktopId: string, token: string, name = '') => ({
  type: 'hello.desktop' as const,
  desktopId,
  protocolVersion: 1,
  ...(name ? { name } : {}),
  ...(token ? { token } : {})
});

export const pairingCreateMessage = () => ({ type: 'pairing.create' as const });

export const pairingApproveMessage = (mobileId: string) => ({ type: 'pairing.approve' as const, mobileId });

export const desktopEventMessage = (mobileId: string, payload: DesktopRelayEventPayload) => ({
  type: 'desktop.event' as const,
  mobileId,
  payload
});

export const desktopBroadcastMessage = (payload: DesktopRelayEventPayload) => ({
  type: 'desktop.event' as const,
  payload
});

export const relayReply = (message: RelayServerMessage) => {
  if (message.type === 'relay.ready') return pairingCreateMessage();
  if (message.type === 'pairing.request') return pairingApproveMessage(message.mobileId);
  return;
};
