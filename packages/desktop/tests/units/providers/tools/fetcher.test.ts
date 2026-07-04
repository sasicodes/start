import {
  abortableSleep,
  backoffDelayMs,
  postSse,
  retryAfterDelayMs,
  SearchApiError
} from '@main/providers/tools/search/fetcher';
import { isRecord } from '@main/providers/tools/search/helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

const options = (signal: AbortSignal | null = null) => ({
  signal,
  label: 'Test',
  body: { input: 'query' },
  headers: { 'Content-Type': 'application/json' },
  url: 'https://api.example.com/v1/responses'
});

const sseResponse = (events: readonly Record<string, unknown>[]) => {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')));
        controller.close();
      }
    }),
    { status: 200 }
  );
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('retry-after parsing', () => {
  it('parses delay seconds', () => {
    expect(retryAfterDelayMs('2')).toBe(2000);
    expect(retryAfterDelayMs('0.5')).toBe(500);
    expect(retryAfterDelayMs('-3')).toBe(0);
  });

  it('parses HTTP dates against the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T10:00:00Z'));

    expect(retryAfterDelayMs(new Date('2026-07-02T10:00:05Z').toUTCString())).toBe(5000);
    expect(retryAfterDelayMs(new Date('2026-07-02T09:00:00Z').toUTCString())).toBe(0);
  });

  it('rejects unparsable values', () => {
    expect(retryAfterDelayMs('')).toBeNull();
    expect(retryAfterDelayMs('soon')).toBeNull();
  });
});

describe('backoff delays', () => {
  it('doubles per attempt and caps at ten seconds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);

    expect(backoffDelayMs(1)).toBe(1000);
    expect(backoffDelayMs(2)).toBe(2000);
    expect(backoffDelayMs(5)).toBe(10000);
    expect(backoffDelayMs(9)).toBe(10000);
  });

  it('keeps at least half of the scheduled delay as jitter floor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(backoffDelayMs(1)).toBe(500);
    expect(backoffDelayMs(5)).toBe(5000);
  });
});

describe('abortable sleep', () => {
  it('settles early when the signal aborts', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pending = abortableSleep(60_000, controller.signal).catch((error: unknown) => error);

    controller.abort();

    await expect(pending).resolves.toMatchObject({ message: 'Web search cancelled.' });
  });

  it('rejects immediately for an already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(abortableSleep(1, controller.signal)).rejects.toThrow('Web search cancelled.');
  });
});

describe('postSse retries', () => {
  it('retries a 429 response after the retry-after header delay', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(
        new Response('{"error":{"message":"slow down"}}', { status: 429, headers: { 'retry-after': '2' } })
      )
      .mockResolvedValueOnce(sseResponse([{ value: 1 }]));

    const events: unknown[] = [];
    const pending = postSse(options(), (event) => events.push(event.data));

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events).toEqual([{ value: 1 }]);
  });

  it('gives up after three attempts and throws a typed error', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response('{"error":{"message":"busy"}}', { status: 529 }));

    const pending = postSse(options(), () => {}).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    const failure = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(failure).toBeInstanceOf(SearchApiError);
    expect(failure).toMatchObject({ status: 529, message: 'Test API error (529): busy' });
  });

  it('does not retry non-retryable statuses', async () => {
    fetchMock.mockResolvedValue(new Response('bad request', { status: 400 }));

    await expect(postSse(options(), () => {})).rejects.toThrow('Test API error (400): bad request');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up without sleeping when retry-after exceeds the total wait budget', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '60' } }));

    const failure = await postSse(options(), () => {}).catch((error: unknown) => error);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(failure).toMatchObject({ status: 429 });
  });

  it('stops the retry backoff when the signal aborts', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => new Response('', { status: 503 }));

    const pending = postSse(options(controller.signal), () => {}).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();

    await expect(pending).resolves.toMatchObject({ message: 'Web search cancelled.' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('truncates long error bodies', async () => {
    fetchMock.mockResolvedValue(new Response('x'.repeat(2000), { status: 400 }));

    const failure = await postSse(options(), () => {}).catch((error: unknown) => error);

    expect(failure).toMatchObject({ message: `Test API error (400): ${'x'.repeat(500)}` });
  });

  it('prefers JSON error fields over the raw body', async () => {
    const body = JSON.stringify({
      error: { type: 'invalid_request_error', message: 'Bad tool.', padding: 'x'.repeat(1000) }
    });
    fetchMock.mockResolvedValue(new Response(body, { status: 400 }));

    await expect(postSse(options(), () => {})).rejects.toThrow(
      'Test API error (400): invalid_request_error: Bad tool.'
    );
  });

  it('retries mid-stream rate limits when no events were delivered yet', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(sseResponse([{ type: 'error' }]))
      .mockResolvedValueOnce(sseResponse([{ type: 'ok' }]));

    const seen: unknown[] = [];
    const pending = postSse(options(), ({ data }) => {
      if (isRecord(data) && data.type === 'error') {
        throw new SearchApiError({ status: 529, message: 'Overloaded' });
      }
      seen.push(data);
    });

    await vi.advanceTimersByTimeAsync(10_000);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(seen).toEqual([{ type: 'ok' }]);
  });

  it('rethrows mid-stream failures once events were delivered', async () => {
    fetchMock.mockResolvedValue(sseResponse([{ type: 'ok' }, { type: 'error' }]));

    const seen: unknown[] = [];
    const pending = postSse(options(), ({ data }) => {
      if (isRecord(data) && data.type === 'error') {
        throw new SearchApiError({ status: 429, message: 'Rate limited' });
      }
      seen.push(data);
    });

    await expect(pending).rejects.toThrow('Rate limited');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([{ type: 'ok' }]);
  });
});
