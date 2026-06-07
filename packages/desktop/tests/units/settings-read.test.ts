import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateStartState = vi.fn();
let storedState: unknown;

vi.mock('@main/storage', () => ({
  readStartState: () => storedState,
  updateStartState: (patch: unknown) => updateStartState(patch)
}));

vi.mock('@main/device', () => ({
  loadDesktopId: () => 'generated-desktop-id',
  loadDesktopName: () => 'MacBook.local'
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
    expect(settings.mobileRelay.desktopName).toBe('MacBook.local');
    expect(updateStartState).toHaveBeenCalledTimes(1);
    expect(updateStartState).toHaveBeenCalledWith({ mobileRelay: settings.mobileRelay });
  });

  it('does not write when the desktop identity already exists', async () => {
    storedState = {
      mobileRelay: {
        enabled: false,
        relayUrl: '',
        relayToken: '',
        desktopName: 'Existing.local',
        desktopId: 'existing-desktop-id'
      }
    };

    const settings = await readAppSettings();

    expect(settings.mobileRelay.desktopId).toBe('existing-desktop-id');
    expect(settings.mobileRelay.desktopName).toBe('Existing.local');
    expect(updateStartState).not.toHaveBeenCalled();
  });
});
