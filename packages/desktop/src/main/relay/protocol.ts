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

const serverMessageSchema = v.union([relayReadySchema, relayErrorSchema, pairingCreatedSchema, pairingRequestSchema]);

export type RelayServerMessage = v.InferOutput<typeof serverMessageSchema>;

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

export const helloDesktopMessage = (desktopId: string, token: string) => ({
  type: 'hello.desktop' as const,
  desktopId,
  protocolVersion: 1,
  ...(token ? { token } : {})
});

export const pairingCreateMessage = () => ({ type: 'pairing.create' as const });

export const pairingApproveMessage = (mobileId: string) => ({ type: 'pairing.approve' as const, mobileId });

export const relayReply = (message: RelayServerMessage) => {
  if (message.type === 'relay.ready') return pairingCreateMessage();
  if (message.type === 'pairing.request') return pairingApproveMessage(message.mobileId);
  return;
};
