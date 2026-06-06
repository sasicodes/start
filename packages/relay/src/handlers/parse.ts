import * as v from 'valibot';
import type { RawData, WebSocket } from 'ws';
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

export const parseDesktopMessage = (socket: WebSocket, data: RawData): DesktopMessage | null => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    sendJson(socket, relayError(parsed.error));
    return null;
  }

  const result = v.safeParse(desktopMessageSchema, parsed.value);
  if (!result.success) {
    sendJson(socket, relayError('Desktop message shape is invalid.'));
    return null;
  }

  return result.output;
};

export const parseMobileMessage = (socket: WebSocket, data: RawData): MobileMessage | null => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    sendJson(socket, relayError(parsed.error));
    return null;
  }

  const result = v.safeParse(mobileMessageSchema, parsed.value);
  if (!result.success) {
    sendJson(socket, relayError('Mobile message shape is invalid.'));
    return null;
  }

  return result.output;
};
