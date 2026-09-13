import { completeBrowserOpen, hasBrowserOpenRequest, requestBrowserOpen } from '@main/browser/requests';
import { broadcastsByChannel, resetBroadcasts } from '../../fakes/window.js';

const requestIdAt = (index: number) => {
  const request = broadcastsByChannel('app:browser-open-request')[index]?.args[0] as { requestId: string };
  return request.requestId;
};

beforeEach(resetBroadcasts);

describe('browser open requests', () => {
  it('keeps simultaneous requests separate when they complete out of order', async () => {
    const first = requestBrowserOpen('https://first.example/', { newTab: true });
    const second = requestBrowserOpen('https://second.example/', { newTab: true });
    const firstId = requestIdAt(0);
    const secondId = requestIdAt(1);
    completeBrowserOpen(secondId, { ok: true });
    expect(hasBrowserOpenRequest(firstId)).toBe(true);
    expect(hasBrowserOpenRequest(secondId)).toBe(false);
    completeBrowserOpen(firstId, { ok: false, error: 'Failed to load.' });
    await expect(first).resolves.toEqual({ ok: false, error: 'Failed to load.' });
    await expect(second).resolves.toEqual({ ok: true });
  });

  it('expires missing replies and ignores late completions', async () => {
    vi.useFakeTimers();
    try {
      const pending = requestBrowserOpen('https://example.com/', {});
      const requestId = requestIdAt(0);
      completeBrowserOpen('unrelated-request', { ok: true });
      expect(hasBrowserOpenRequest(requestId)).toBe(true);
      await vi.advanceTimersByTimeAsync(15000);
      await expect(pending).resolves.toMatchObject({ ok: false, error: expect.stringContaining('timed out') });
      expect(hasBrowserOpenRequest(requestId)).toBe(false);
      completeBrowserOpen(requestId, { ok: true });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bounds pending requests and releases their timers on completion', async () => {
    vi.useFakeTimers();
    try {
      const pending = Array.from({ length: 32 }, () => requestBrowserOpen('https://example.com/', {}));
      expect(() => requestBrowserOpen('https://example.com/', {})).toThrow('Too many pending');
      for (let index = 0; index < pending.length; index++) completeBrowserOpen(requestIdAt(index), { ok: true });
      await Promise.all(pending);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
