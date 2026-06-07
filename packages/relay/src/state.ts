import { randomInt } from 'node:crypto';
import type { WebSocket } from 'ws';
import { maxPairingSessions, pairingCodeMax, pairingCodeMin } from './constants';
import type { DesktopConnection, MobileConnection, PairingSession, RelaySnapshot } from './types';

export const pickUnusedCode = (isTaken: (code: string) => boolean, nextCode: () => string, maxAttempts: number) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = nextCode();
    if (!isTaken(code)) return code;
  }

  throw new Error('Unable to allocate a unique pairing code.');
};

export class RelayState {
  private readonly mobiles = new Map<string, MobileConnection>();
  private readonly routes = new Map<string, Set<string>>();
  private readonly desktops = new Map<string, DesktopConnection>();
  private readonly pairings = new Map<string, PairingSession>();

  addDesktop(connection: Omit<DesktopConnection, 'connectedAt'>) {
    this.desktops.get(connection.desktopId)?.socket.close();
    this.desktops.set(connection.desktopId, { ...connection, connectedAt: Date.now() });
  }

  addMobile(connection: Omit<MobileConnection, 'connectedAt'>) {
    this.mobiles.get(connection.mobileId)?.socket.close();
    this.mobiles.set(connection.mobileId, { ...connection, connectedAt: Date.now() });
  }

  approveRoute(desktopId: string, mobileId: string) {
    const routes = this.routes.get(desktopId) ?? new Set<string>();
    routes.add(mobileId);
    this.routes.set(desktopId, routes);
  }

  consumePairing(code: string): PairingSession | null {
    this.deleteExpiredPairings();
    const pairing = this.pairings.get(code);
    if (!pairing) return null;

    this.pairings.delete(code);
    return pairing;
  }

  peekPairing(code: string): PairingSession | null {
    this.deleteExpiredPairings();
    return this.pairings.get(code) ?? null;
  }

  createPairing(desktopId: string, ttlMs: number) {
    this.deleteExpiredPairings();
    this.trimPairings();

    const code = this.unusedPairingCode();
    const expiresAt = Date.now() + ttlMs;
    this.pairings.set(code, { code, desktopId, expiresAt });
    return { code, expiresAt };
  }

  deleteDesktop(desktopId: string, socket: WebSocket) {
    if (this.desktops.get(desktopId)?.socket !== socket) return;
    this.routes.delete(desktopId);
    this.desktops.delete(desktopId);
  }

  deleteMobile(mobileId: string, socket: WebSocket): string[] {
    if (this.mobiles.get(mobileId)?.socket !== socket) return [];

    const desktopIds: string[] = [];
    for (const [desktopId, routes] of this.routes) {
      if (!routes.delete(mobileId)) continue;

      desktopIds.push(desktopId);
      if (routes.size === 0) this.routes.delete(desktopId);
    }

    this.mobiles.delete(mobileId);
    return desktopIds;
  }

  desktopSocket(desktopId: string) {
    return this.desktops.get(desktopId)?.socket ?? null;
  }

  isRouteApproved(desktopId: string, mobileId: string) {
    return this.routes.get(desktopId)?.has(mobileId) ?? false;
  }

  mobileIds(desktopId: string) {
    return (this.routes.get(desktopId) ?? new Set<string>()).values();
  }

  mobileSocket(mobileId: string) {
    return this.mobiles.get(mobileId)?.socket ?? null;
  }

  snapshot(): RelaySnapshot {
    this.deleteExpiredPairings();
    return {
      mobiles: this.mobiles.size,
      desktops: this.desktops.size,
      pairings: this.pairings.size
    };
  }

  private deleteExpiredPairings() {
    const now = Date.now();
    for (const [code, pairing] of this.pairings) {
      if (pairing.expiresAt <= now) this.pairings.delete(code);
    }
  }

  private trimPairings() {
    while (this.pairings.size >= maxPairingSessions) {
      const code = this.pairings.keys().next().value;
      if (!code) return;
      this.pairings.delete(code);
    }
  }

  private unusedPairingCode() {
    return pickUnusedCode(
      (code) => this.pairings.has(code),
      () => String(randomInt(pairingCodeMin, pairingCodeMax + 1)),
      maxPairingSessions
    );
  }
}
