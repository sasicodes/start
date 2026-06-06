import { ANALYTICS_STORAGE_NAME, DESKTOP_ID_STORAGE_NAME } from '@main/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const values = new Map<string, string>();

vi.mock('@main/local-state', () => ({
  readLocalStateValue: (name: string) => values.get(name),
  writeLocalStateValue: (name: string, value: string) => {
    values.set(name, value);
  }
}));

const { loadDesktopId } = await import('@main/device');

describe('loadDesktopId', () => {
  beforeEach(() => {
    values.clear();
  });

  it('reuses the saved desktop id', () => {
    values.set(DESKTOP_ID_STORAGE_NAME, 'desktop-1');

    expect(loadDesktopId()).toBe('desktop-1');
  });

  it('migrates the analytics id', () => {
    values.set(ANALYTICS_STORAGE_NAME, 'analytics-1');

    expect(loadDesktopId()).toBe('analytics-1');
    expect(values.get(DESKTOP_ID_STORAGE_NAME)).toBe('analytics-1');
  });

  it('generates and saves a desktop id once', () => {
    const id = loadDesktopId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(loadDesktopId()).toBe(id);
  });
});
