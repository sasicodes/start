import type { WebSocket } from 'ws';

export interface RelayConfig {
  port: number;
  token: string;
  pairingTtlMs: number;
}

export interface RelayError {
  message: string;
  type: 'relay.error';
}

export interface RelaySnapshot {
  mobiles: number;
  desktops: number;
  pairings: number;
}

export interface DesktopConnection {
  name?: string;
  socket: WebSocket;
  desktopId: string;
  connectedAt: number;
}

export interface MobileConnection {
  name?: string;
  mobileId: string;
  socket: WebSocket;
  connectedAt: number;
}

export interface PairingRequest {
  code: string;
  name?: string;
  mobileId: string;
  publicKey?: string;
}

export interface PairingSession {
  code: string;
  desktopId: string;
  expiresAt: number;
}

export type JsonMessageResult = { ok: true; value: unknown } | { ok: false; error: string };
