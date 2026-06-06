import type { WebSocket } from 'ws';
import { pickUnusedCode, RelayState } from '../src/state';
import { describe, expect, it } from 'vitest';

const socket = () => ({ close: () => {} }) as unknown as WebSocket;

const closeTrackingSocket = () => {
  const calls: string[] = [];
  return {
    calls,
    socket: {
      close: () => calls.push('close')
    } as unknown as WebSocket
  };
};

describe('RelayState', () => {
  it('creates and consumes short-lived pairing codes', () => {
    const state = new RelayState();
    const pairing = state.createPairing('desktop-1', 1000);

    expect(pairing.code).toHaveLength(6);
    expect(state.consumePairing(pairing.code)?.desktopId).toBe('desktop-1');
    expect(state.consumePairing(pairing.code)).toBeNull();
  });

  it('generates unique six-digit numeric pairing codes', () => {
    const state = new RelayState();
    const codes = Array.from({ length: 100 }, () => state.createPairing('desktop-1', 1000).code);

    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[1-9]\d{5}$/u);
  });

  it('drops expired pairing codes on access', () => {
    const state = new RelayState();
    const pairing = state.createPairing('desktop-1', -1);

    expect(state.consumePairing(pairing.code)).toBeNull();
  });

  it('peeks a pairing code without consuming it', () => {
    const state = new RelayState();
    const pairing = state.createPairing('desktop-1', 1000);

    expect(state.peekPairing(pairing.code)?.desktopId).toBe('desktop-1');
    expect(state.peekPairing(pairing.code)?.desktopId).toBe('desktop-1');
    expect(state.consumePairing(pairing.code)?.desktopId).toBe('desktop-1');
  });

  it('deduplicates routes from one desktop to one mobile', () => {
    const state = new RelayState();
    state.addDesktop({ socket: socket(), desktopId: 'desktop-1' });
    state.addMobile({ socket: socket(), mobileId: 'mobile-1' });

    expect(state.isRouteApproved('desktop-1', 'mobile-1')).toBe(false);
    expect([...state.mobileIds('desktop-1')]).toEqual([]);

    state.approveRoute('desktop-1', 'mobile-1');
    state.approveRoute('desktop-1', 'mobile-1');

    expect(state.isRouteApproved('desktop-1', 'mobile-1')).toBe(true);
    expect([...state.mobileIds('desktop-1')]).toEqual(['mobile-1']);
  });

  it('allows one mobile to pair with multiple desktops', () => {
    const state = new RelayState();
    state.addDesktop({ socket: socket(), desktopId: 'desktop-1' });
    state.addDesktop({ socket: socket(), desktopId: 'desktop-2' });
    state.addMobile({ socket: socket(), mobileId: 'mobile-1' });

    state.approveRoute('desktop-1', 'mobile-1');
    state.approveRoute('desktop-2', 'mobile-1');

    expect(state.isRouteApproved('desktop-1', 'mobile-1')).toBe(true);
    expect(state.isRouteApproved('desktop-2', 'mobile-1')).toBe(true);
    expect([...state.mobileIds('desktop-1')]).toEqual(['mobile-1']);
    expect([...state.mobileIds('desktop-2')]).toEqual(['mobile-1']);
  });

  it('removes a mobile route from every desktop when the mobile disconnects', () => {
    const state = new RelayState();
    const mobile = socket();
    state.addDesktop({ socket: socket(), desktopId: 'desktop-1' });
    state.addDesktop({ socket: socket(), desktopId: 'desktop-2' });
    state.addMobile({ socket: mobile, mobileId: 'mobile-1' });
    state.approveRoute('desktop-1', 'mobile-1');
    state.approveRoute('desktop-2', 'mobile-1');

    state.deleteMobile('mobile-1', mobile);

    expect(state.isRouteApproved('desktop-1', 'mobile-1')).toBe(false);
    expect(state.isRouteApproved('desktop-2', 'mobile-1')).toBe(false);
  });

  it('replaces duplicate desktop and mobile connections by id', () => {
    const state = new RelayState();
    const firstDesktop = closeTrackingSocket();
    const firstMobile = closeTrackingSocket();

    state.addDesktop({ socket: firstDesktop.socket, desktopId: 'desktop-1' });
    state.addDesktop({ socket: socket(), desktopId: 'desktop-1' });
    state.addMobile({ socket: firstMobile.socket, mobileId: 'mobile-1' });
    state.addMobile({ socket: socket(), mobileId: 'mobile-1' });

    expect(firstDesktop.calls).toEqual(['close']);
    expect(firstMobile.calls).toEqual(['close']);
    expect(state.snapshot()).toEqual({ desktops: 1, mobiles: 1, pairings: 0 });
  });
});

describe('pickUnusedCode', () => {
  it('returns the first code that is not already taken', () => {
    const codes = ['111111', '222222', '333333'];
    let index = 0;
    expect(
      pickUnusedCode(
        (code) => code === '111111',
        () => codes[index++],
        5
      )
    ).toBe('222222');
  });

  it('throws once the attempt budget is exhausted', () => {
    expect(() =>
      pickUnusedCode(
        () => true,
        () => '111111',
        3
      )
    ).toThrow(/unique pairing code/u);
  });
});
