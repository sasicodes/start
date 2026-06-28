import { setStayAwake, shouldStayAwake } from '@main/utils/power';
import electron from 'electron';
import { afterAll, describe, expect, it, vi } from 'vitest';

describe('shouldStayAwake', () => {
  it('stays awake only when enabled, relay active, and on AC power', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: false, relayActive: true })).toBe(true);
  });

  it('never stays awake while the relay is inactive', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: false, relayActive: false })).toBe(false);
  });

  it('never stays awake on battery', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: true, relayActive: true })).toBe(false);
  });

  it('never stays awake when keep-awake is off', () => {
    expect(shouldStayAwake({ keepAwake: false, onBattery: false, relayActive: true })).toBe(false);
  });
});

describe('setStayAwake', () => {
  afterAll(() => setStayAwake(false));

  it('starts one blocker, ignores repeats, and stops it', () => {
    const { powerSaveBlocker } = electron;
    const start = vi.spyOn(powerSaveBlocker, 'start');
    const stop = vi.spyOn(powerSaveBlocker, 'stop');

    setStayAwake(true);
    setStayAwake(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith('prevent-app-suspension');

    setStayAwake(false);
    setStayAwake(false);
    expect(stop).toHaveBeenCalledTimes(1);

    setStayAwake(true);
    expect(start).toHaveBeenCalledTimes(2);
  });
});
