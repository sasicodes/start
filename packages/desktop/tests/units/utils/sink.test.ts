import { expect, it, vi } from 'vitest';

const loadSink = () => vi.importActual<typeof import('@main/utils/sink')>('@main/utils/sink');

it('keeps every entry when under the cap', async () => {
  const { tailEntries } = await loadSink();
  expect(tailEntries(['a', 'b'], 3)).toEqual(['a', 'b']);
});

it('drops the oldest entries past the cap', async () => {
  const { tailEntries } = await loadSink();
  expect(tailEntries(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'd']);
});
