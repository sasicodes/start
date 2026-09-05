import { completeFinderDraft } from '@renderer/shared/composer/utils/completion';
import { browserFinderItem, goalFinderItem, newSessionFinderItem } from '@renderer/shared/finder/static';
import { expect, it } from 'vitest';

it('inserts Goal without changing the surrounding prompt', () => {
  expect(completeFinderDraft('@', goalFinderItem, true)).toBe('@Goal ');
  expect(completeFinderDraft('Review @src/index.ts using @go', goalFinderItem, false)).toBe(
    'Review @src/index.ts using @Goal '
  );
});

it('preserves Browser and New Session mention completion', () => {
  expect(completeFinderDraft('@bro', browserFinderItem, false)).toBe('@Browser ');
  expect(completeFinderDraft('Run this @new', newSessionFinderItem, true)).toBe('Run this @New Session ');
});

it('keeps file, directory, and slash command completion unchanged', () => {
  expect(completeFinderDraft('@sr', { name: 'src', path: 'src', type: 'directory' }, true)).toBe('@src/');
  expect(completeFinderDraft('~/sr', { name: 'src', path: 'src', type: 'directory' }, false)).toBe('~/src ');
  expect(completeFinderDraft('@src/in', { name: 'index.ts', path: 'src/index.ts', type: 'file' }, true)).toBe(
    '@src/index.ts '
  );
  expect(completeFinderDraft('/com', { key: 'compact', name: 'compact', type: 'command' }, false)).toBe('/compact ');
});

it('ignores stale selections when the input no longer ends in a compatible token', () => {
  expect(completeFinderDraft('new typing', goalFinderItem, true)).toBeNull();
  expect(completeFinderDraft('/compact', goalFinderItem, true)).toBeNull();
  expect(completeFinderDraft('@src', { key: 'compact', name: 'compact', type: 'command' }, true)).toBeNull();
});
