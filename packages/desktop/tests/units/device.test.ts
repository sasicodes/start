import { ANALYTICS_STORAGE_NAME, DESKTOP_ID_STORAGE_NAME } from '@main/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const os = vi.hoisted(() => ({ hostname: 'MacBook.local' }));
const values = new Map<string, string>();

vi.mock('node:os', () => ({
  hostname: () => os.hostname
}));

vi.mock('@main/local-state', () => ({
  readLocalStateValue: (name: string) => values.get(name),
  writeLocalStateValue: (name: string, value: string) => {
    values.set(name, value);
  }
}));

const { loadDesktopId, loadDesktopName } = await import('@main/device');

describe('loadDesktopId', () => {
  beforeEach(() => {
    values.clear();
    os.hostname = 'MacBook.local';
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

describe('loadDesktopName', () => {
  beforeEach(() => {
    values.clear();
    os.hostname = 'MacBook.local';
  });

  it('uses the local host name', () => {
    expect(loadDesktopName('desktop-1')).toBe('MacBook.local');
  });

  it('trims and bounds the local host name', () => {
    os.hostname = ` ${'a'.repeat(90)} `;

    expect(loadDesktopName('desktop-1')).toHaveLength(80);
  });

  it('falls back to the desktop id prefix', () => {
    os.hostname = ' ';

    expect(loadDesktopName('1234567890')).toBe('Desktop 12345678');
  });
});
