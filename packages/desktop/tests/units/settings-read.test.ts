import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateStartState = vi.fn();
let storedState: unknown;

vi.mock('@main/storage', () => ({
  readStartState: () => storedState,
  updateStartState: (patch: unknown) => updateStartState(patch)
}));

vi.mock('@main/device', () => ({
  loadDesktopId: () => 'generated-desktop-id'
}));

const { readAppSettings } = await import('@main/settings');

describe('readAppSettings', () => {
  beforeEach(() => {
    updateStartState.mockClear();
    storedState = undefined;
  });

  it('persists a freshly generated desktop id once', async () => {
    const settings = await readAppSettings();

    expect(settings.mobileRelay.desktopId).toBe('generated-desktop-id');
    expect(updateStartState).toHaveBeenCalledTimes(1);
    expect(updateStartState).toHaveBeenCalledWith({ mobileRelay: settings.mobileRelay });
  });

  it('does not write when the desktop id already exists', async () => {
    storedState = { mobileRelay: { desktopId: 'existing-desktop-id', enabled: false, relayToken: '', relayUrl: '' } };

    const settings = await readAppSettings();

    expect(settings.mobileRelay.desktopId).toBe('existing-desktop-id');
    expect(updateStartState).not.toHaveBeenCalled();
  });
});
