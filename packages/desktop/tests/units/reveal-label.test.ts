import { revealLabel } from '@renderer/shared/workspace/changes/diff/reveal-label';
import { describe, expect, it } from 'vitest';

describe('revealLabel', () => {
  it('returns the Finder label on macOS', () => {
    expect(revealLabel('darwin')).toBe('Reveal in Finder');
  });

  it('returns the Explorer label on Windows', () => {
    expect(revealLabel('win32')).toBe('Show in Explorer');
  });

  it('returns a generic folder label on Linux', () => {
    expect(revealLabel('linux')).toBe('Show in Folder');
  });

  it('falls back to the generic folder label on uncommon platforms', () => {
    expect(revealLabel('freebsd')).toBe('Show in Folder');
    expect(revealLabel('openbsd')).toBe('Show in Folder');
    expect(revealLabel('sunos')).toBe('Show in Folder');
  });
});
