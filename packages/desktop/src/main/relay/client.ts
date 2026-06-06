import { WebSocket } from 'ws';
import type { MobileRelaySettings } from '@main/storage';
import {
  desktopEventMessage,
  helloDesktopMessage,
  pairingCreateMessage,
  parseRelayServerMessage,
  relayReply,
  type RelayCommand
} from '@main/relay/protocol';

export interface RelaySocket {
  close: () => void;
  send: (data: string) => void;
}

export interface DesktopRelayCallbacks {
  onCode: (code: string) => void;
  onCommand: (command: RelayCommand) => void;
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

const isRelayUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'ws:' || protocol === 'wss:';
  } catch {
    return false;
  }
};

const wsSocketFactory: RelaySocketFactory = (url, handlers) => {
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

  constructor(
    private readonly callbacks: DesktopRelayCallbacks,
    private readonly createSocket: RelaySocketFactory = wsSocketFactory
  ) {}

  get currentCode() {
    return this.code;
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
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.setCode('');
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
    if (message.type === 'mobile.command') {
      this.callbacks.onCommand(message.payload);
      this.send(desktopEventMessage(message.mobileId, { value: message.payload.action, action: 'ack' }));
    }

    const reply = relayReply(message);
    if (reply) this.send(reply);
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
