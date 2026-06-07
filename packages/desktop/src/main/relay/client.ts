import {
  desktopBroadcastMessage,
  desktopEventMessage,
  type DesktopRelayEventPayload,
  helloDesktopMessage,
  type MobileRelayCommand,
  pairingCreateMessage,
  parseRelayServerMessage,
  relayReply
} from '@main/relay/protocol';
import type { MobileRelaySettings } from '@main/storage';
import { WebSocket } from 'ws';

export interface RelaySocket {
  close: () => void;
  send: (data: string) => void;
}

export interface DesktopRelayCallbacks {
  onCode: (code: string) => void;
  onCommand: (command: MobileRelayCommand, context: DesktopRelayCommandContext) => Promise<void> | void;
}

export interface DesktopRelayCommandContext {
  mobileId: string;
  reply: (payload: DesktopRelayEventPayload) => void;
  broadcast: (payload: DesktopRelayEventPayload) => void;
}

export interface RelaySocketHandlers {
  onOpen: () => void;
  onClose: () => void;
  onMessage: (data: string) => void;
}

export type RelaySocketFactory = (url: string, handlers: RelaySocketHandlers) => RelaySocket;

const reconnectDelayMs = 3000;
const minRefreshDelayMs = 5000;
const codeRefreshBufferMs = 30000;

export const isRelayUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'ws:' || protocol === 'wss:';
  } catch {
    return false;
  }
};

export const wsSocketFactory: RelaySocketFactory = (url, handlers) => {
  const socket = new WebSocket(url);
  socket.on('open', handlers.onOpen);
  socket.on('close', handlers.onClose);
  socket.on('message', (data) => handlers.onMessage(data.toString()));
  socket.on('error', () => socket.close());
  return {
    send: (data) => socket.send(data),
    close: () => socket.close()
  };
};

export class DesktopRelay {
  private code = '';
  private active = false;
  private relayUrl = '';
  private desktopId = '';
  private relayToken = '';
  private socket: RelaySocket | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pairedMobileIds = new Set<string>();

  constructor(
    private readonly callbacks: DesktopRelayCallbacks,
    private readonly createSocket: RelaySocketFactory = wsSocketFactory
  ) {}

  get currentCode() {
    return this.code;
  }

  get isActive() {
    return this.active;
  }

  sync(settings: MobileRelaySettings) {
    if (!settings.enabled || !settings.desktopId || !isRelayUrl(settings.relayUrl)) {
      this.stop();
      return;
    }

    const unchanged =
      this.active &&
      this.relayUrl === settings.relayUrl &&
      this.desktopId === settings.desktopId &&
      this.relayToken === settings.relayToken;
    if (unchanged) return;

    this.stop();
    this.active = true;
    this.relayUrl = settings.relayUrl;
    this.desktopId = settings.desktopId;
    this.relayToken = settings.relayToken;
    this.open();
  }

  stop() {
    this.active = false;
    this.pairedMobileIds.clear();
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.setCode('');
  }

  broadcast(payload: DesktopRelayEventPayload): boolean {
    if (this.pairedMobileIds.size === 0) return false;
    this.send(desktopBroadcastMessage(payload));
    return true;
  }

  private open() {
    this.socket = this.createSocket(this.relayUrl, {
      onOpen: () => this.send(helloDesktopMessage(this.desktopId, this.relayToken)),
      onClose: () => this.scheduleReconnect(),
      onMessage: (data) => this.receive(data)
    });
  }

  private receive(raw: string) {
    const message = parseRelayServerMessage(raw);
    if (!message) return;
    if (message.type === 'pairing.created') {
      this.setCode(message.code);
      this.scheduleRefresh(message.expiresAt);
    }
    if (message.type === 'pairing.request') {
      this.pairedMobileIds.add(message.mobileId);
    }
    if (message.type === 'mobile.disconnected') {
      this.pairedMobileIds.delete(message.mobileId);
    }
    if (message.type === 'mobile.command') {
      this.pairedMobileIds.add(message.mobileId);
      this.handleCommand(message.mobileId, message.payload);
    }

    const reply = relayReply(message);
    if (reply) this.send(reply);
  }

  private async handleCommand(mobileId: string, command: MobileRelayCommand) {
    const context: DesktopRelayCommandContext = {
      mobileId,
      reply: (payload) => this.send(desktopEventMessage(mobileId, payload)),
      broadcast: (payload) => this.broadcast(payload)
    };

    try {
      const result = this.callbacks.onCommand(command, context);
      if (command.action === 'prompt') context.reply({ action: 'ack', value: command.action });
      await result;
    } catch (error) {
      context.reply(this.errorPayload(command, error));
    }
  }

  private errorPayload(command: MobileRelayCommand, error: unknown): DesktopRelayEventPayload {
    const message = error instanceof Error ? error.message : 'Mobile command failed.';
    if ('requestId' in command) {
      return {
        ok: false,
        requestId: command.requestId,
        action: `${command.action}.result`,
        error: message
      };
    }
    return { action: 'error', error: message, value: command.action };
  }

  private setCode(code: string) {
    if (this.code === code) return;
    this.code = code;
    this.callbacks.onCode(code);
  }

  private send(message: object) {
    this.socket?.send(JSON.stringify(message));
  }

  private scheduleRefresh(expiresAt: number) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delay = Math.max(minRefreshDelayMs, expiresAt - Date.now() - codeRefreshBufferMs);
    this.refreshTimer = setTimeout(() => this.send(pairingCreateMessage()), delay);
  }

  private scheduleReconnect() {
    this.socket = null;
    this.setCode('');
    this.pairedMobileIds.clear();
    if (!this.active || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.active) this.open();
    }, reconnectDelayMs);
  }

  private clearTimers() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.refreshTimer = null;
    this.reconnectTimer = null;
  }
}
