import { setStayAwake } from '@main/utils/power';
import electron from 'electron';
import { afterAll, describe, expect, it, vi } from 'vitest';

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
