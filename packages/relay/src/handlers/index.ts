import * as v from 'valibot';
import type { RawData, WebSocket } from 'ws';
import { helloDesktopSchema, helloMobileSchema, parseJsonMessage } from '../protocol';
import { closeWithError } from '../socket';
import type { RelayConfig, RelayContext } from '../types';
import { handleDesktop } from './desktop';
import { handleMobile } from './mobile';
import { sourceFromRawData } from './parse';

const authenticated = (config: RelayConfig, token?: string) => !config.token || token === config.token;

export const handleHello = (context: RelayContext, socket: WebSocket, data: RawData) => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    closeWithError(socket, parsed.error);
    return;
  }

  const desktop = v.safeParse(helloDesktopSchema, parsed.value);
  if (desktop.success) {
    if (!authenticated(context.config, desktop.output.token)) {
      closeWithError(socket, 'Relay token is invalid.');
      return;
    }

    handleDesktop(context, socket, desktop.output);
    return;
  }

  const mobile = v.safeParse(helloMobileSchema, parsed.value);
  if (mobile.success) {
    if (!authenticated(context.config, mobile.output.token)) {
      closeWithError(socket, 'Relay token is invalid.');
      return;
    }

    handleMobile(context, socket, mobile.output);
    return;
  }

  closeWithError(socket, 'First message must be a valid hello message.');
};
