import * as v from 'valibot';
import {
  clientNameMaxLength,
  idMaxLength,
  messageMaxBytes,
  pairingCodeLength,
  protocolVersion,
  tokenMaxLength
} from './constants';
import type { JsonMessageResult } from './types';

const trimmedStringSchema = v.pipe(v.string(), v.trim(), v.minLength(1));
const idSchema = v.pipe(trimmedStringSchema, v.maxLength(idMaxLength));
const tokenSchema = v.pipe(trimmedStringSchema, v.maxLength(tokenMaxLength));
const clientNameSchema = v.pipe(trimmedStringSchema, v.maxLength(clientNameMaxLength));
const pairingCodeSchema = v.pipe(trimmedStringSchema, v.length(pairingCodeLength));

const pairingCreateSchema = v.object({
  type: v.literal('pairing.create')
});

const pairingJoinSchema = v.object({
  type: v.literal('pairing.join'),
  code: pairingCodeSchema,
  name: v.optional(clientNameSchema),
  publicKey: v.optional(tokenSchema)
});

const pairingApproveSchema = v.object({
  type: v.literal('pairing.approve'),
  mobileId: idSchema
});

const desktopEventSchema = v.object({
  type: v.literal('desktop.event'),
  payload: v.unknown(),
  mobileId: v.optional(idSchema)
});

const mobileCommandSchema = v.object({
  type: v.literal('mobile.command'),
  payload: v.unknown(),
  desktopId: idSchema
});

export const helloDesktopSchema = v.object({
  type: v.literal('hello.desktop'),
  token: v.optional(tokenSchema),
  name: v.optional(clientNameSchema),
  desktopId: idSchema,
  protocolVersion: v.literal(protocolVersion)
});

export const helloMobileSchema = v.object({
  type: v.literal('hello.mobile'),
  token: v.optional(tokenSchema),
  name: v.optional(clientNameSchema),
  mobileId: idSchema,
  protocolVersion: v.literal(protocolVersion)
});

export const desktopMessageSchema = v.union([pairingCreateSchema, pairingApproveSchema, desktopEventSchema]);
export const mobileMessageSchema = v.union([pairingJoinSchema, mobileCommandSchema]);

export type HelloMobile = v.InferOutput<typeof helloMobileSchema>;
export type HelloDesktop = v.InferOutput<typeof helloDesktopSchema>;
export type MobileMessage = v.InferOutput<typeof mobileMessageSchema>;
export type DesktopMessage = v.InferOutput<typeof desktopMessageSchema>;

export const parseJsonMessage = (source: string): JsonMessageResult => {
  if (Buffer.byteLength(source, 'utf8') > messageMaxBytes) return { ok: false, error: 'Message is too large.' };

  try {
    return { ok: true, value: JSON.parse(source) as unknown };
  } catch {
    return { ok: false, error: 'Message is not valid JSON.' };
  }
};
