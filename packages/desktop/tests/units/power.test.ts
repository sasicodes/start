import { setStayAwake, shouldStayAwake } from '@main/utils/power';
import electron from 'electron';
import { afterAll, describe, expect, it, vi } from 'vitest';

describe('shouldStayAwake', () => {
  it('stays awake on AC power while an agent is working', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: false, relayActive: false, workInProgress: true })).toBe(true);
  });

  it('stays awake on AC power while remote access is active', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: false, relayActive: true, workInProgress: false })).toBe(true);
  });

  it('allows sleep without active work or remote access', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: false, relayActive: false, workInProgress: false })).toBe(
      false
    );
  });

  it('allows sleep on battery or when disabled', () => {
    expect(shouldStayAwake({ keepAwake: true, onBattery: true, relayActive: true, workInProgress: true })).toBe(false);
    expect(shouldStayAwake({ keepAwake: false, onBattery: false, relayActive: true, workInProgress: true })).toBe(
      false
    );
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
