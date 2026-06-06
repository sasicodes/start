import * as v from 'valibot';
import type { RawData, WebSocket } from 'ws';
import { logIncoming } from '../log';
import { relayError } from '../messages';
import {
  type DesktopMessage,
  desktopMessageSchema,
  type MobileMessage,
  mobileMessageSchema,
  parseJsonMessage
} from '../protocol';
import { sendJson } from '../socket';

export const sourceFromRawData = (data: RawData) => {
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
};

const parseMessage = <S extends v.GenericSchema>(
  socket: WebSocket,
  data: RawData,
  schema: S,
  label: string
): v.InferOutput<S> | null => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    sendJson(socket, relayError(parsed.error));
    return null;
  }

  logIncoming(parsed.value);

  const result = v.safeParse(schema, parsed.value);
  if (!result.success) {
    sendJson(socket, relayError(`${label} message shape is invalid.`));
    return null;
  }

  return result.output;
};

export const parseDesktopMessage = (socket: WebSocket, data: RawData): DesktopMessage | null =>
  parseMessage(socket, data, desktopMessageSchema, 'Desktop');

export const parseMobileMessage = (socket: WebSocket, data: RawData): MobileMessage | null =>
  parseMessage(socket, data, mobileMessageSchema, 'Mobile');
