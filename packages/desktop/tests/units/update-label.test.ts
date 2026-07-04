import { updateLabel } from '@renderer/shared/updates/state';
import { describe, expect, it } from 'vitest';

describe('updateLabel', () => {
  it('offers the update while one is available', () => {
    expect(updateLabel({ status: 'idle' })).toBe('Update');
    expect(updateLabel({ status: 'available' })).toBe('Update');
  });

  it('shows live progress while downloading', () => {
    expect(updateLabel({ status: 'downloading', percent: 37 })).toBe('Downloading (37%)');
  });

  it('offers the restart once downloaded', () => {
    expect(updateLabel({ status: 'downloaded' })).toBe('Restart');
  });
});
