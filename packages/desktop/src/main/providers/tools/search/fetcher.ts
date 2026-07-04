import { recordValue, stringValue } from '@main/providers/tools/search/helpers';
import type { SseEvent } from '@main/providers/tools/search/types';

const maxAttempts = 3;
const maxSseEvents = 1_000;
const backoffCapMs = 10_000;
const backoffBaseMs = 1_000;
const maxSseBytes = 2_000_000;
const maxTotalWaitMs = 45_000;
const maxErrorBodyChars = 500;
const maxErrorBodyBytes = 4_096;

const retryableStatuses = new Set([429, 500, 502, 503, 504, 529]);

interface PostSseOptions {
  url: string;
  body: unknown;
  label: string;
  signal: AbortSignal | null;
  headers: Record<string, string>;
}

interface SearchApiErrorOptions {
  status: number;
  message: string;
}

export class SearchApiError extends Error {
  readonly status: number;

  constructor({ status, message }: SearchApiErrorOptions) {
    super(message);
    this.name = 'SearchApiError';
    this.status = status;
  }
}

export const searchCancelledError = () => new Error('Web search cancelled.');

export const throwStreamError = (code: string, message: string, statuses: Record<string, number>): never => {
  const status = statuses[code];
  if (status) throw new SearchApiError({ status, message });
  throw new Error(message);
};

export const abortableSleep = (ms: number, signal: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(searchCancelledError());
      return;
    }

    const finish = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const abort = () => {
      clearTimeout(timer);
      reject(searchCancelledError());
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });

export const retryAfterDelayMs = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));

  const dateMs = Date.parse(trimmed);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - Date.now());
};

export const backoffDelayMs = (attempt: number) => {
  const capped = Math.min(backoffCapMs, backoffBaseMs * 2 ** (attempt - 1));
  return Math.round(capped / 2 + Math.random() * (capped / 2));
};

const retryDelayMs = (attempt: number, retryAfter: string | null) =>
  (retryAfter ? retryAfterDelayMs(retryAfter) : null) ?? backoffDelayMs(attempt);

const boundedBodyText = async (response: Response) => {
  if (!response.body) return '';

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let text = '';
  let bytes = 0;
  try {
    while (bytes < maxErrorBodyBytes) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
    }
    return text;
  } catch {
    return text;
  } finally {
    reader.cancel().catch(() => {});
  }
};

const apiErrorDetail = (body: string) => {
  const text = body.trim();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return text.slice(0, maxErrorBodyChars);
  }

  const error = recordValue(data, 'error');
  const type = stringValue(recordValue(error, 'type'));
  const message = stringValue(recordValue(error, 'message'));
  const detail = [type, message].filter(Boolean).join(': ');
  return (detail || text).slice(0, maxErrorBodyChars);
};

const apiError = async (response: Response, label: string) => {
  const detail = apiErrorDetail(await boundedBodyText(response));
  return new SearchApiError({
    status: response.status,
    message: `${label} API error (${response.status})${detail ? `: ${detail}` : ''}`
  });
};

const parseSseData = (raw: string): unknown => JSON.parse(raw);

const readSseEvents = async (response: Response, signal: AbortSignal | null, onEvent: (event: SseEvent) => void) => {
  if (!response.body) throw new Error('No response body.');

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  let bytes = 0;
  let eventCount = 0;
  let currentData = '';
  let currentEvent = '';

  const flush = () => {
    const raw = currentData.trim();
    const event = currentEvent;
    currentData = '';
    currentEvent = '';
    if (!raw || raw === '[DONE]') return;
    eventCount += 1;
    if (eventCount > maxSseEvents) throw new Error('Web search returned too many events.');

    let data: unknown;
    try {
      data = parseSseData(raw);
    } catch (error) {
      if (error instanceof SyntaxError) return;
      throw error;
    }
    onEvent({ event, data });
  };

  try {
    while (true) {
      if (signal?.aborted) throw searchCancelledError();
      const { done, value } = await reader.read();
      if (done) break;

      bytes += value.byteLength;
      if (bytes > maxSseBytes) throw new Error('Web search response is too large.');

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line === '' || line === '\r') {
          flush();
        } else if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          currentData = currentData ? `${currentData}\n${data}` : data;
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim().startsWith('data:')) {
      const data = buffer.trim().slice(5).trim();
      currentData = currentData ? `${currentData}\n${data}` : data;
    }
    flush();
  } finally {
    reader.releaseLock();
  }
};

export const postSse = async (options: PostSseOptions, onEvent: (event: SseEvent) => void) => {
  let waitedMs = 0;

  const retryOrThrow = async (attempt: number, failure: SearchApiError, retryAfter: string | null) => {
    if (attempt >= maxAttempts || !retryableStatuses.has(failure.status)) throw failure;

    const delay = retryDelayMs(attempt, retryAfter);
    if (waitedMs + delay > maxTotalWaitMs) throw failure;

    await abortableSleep(delay, options.signal);
    waitedMs += delay;
  };

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(options.url, {
      body: JSON.stringify(options.body),
      headers: options.headers,
      method: 'POST',
      ...(options.signal ? { signal: options.signal } : {})
    });

    if (!response.ok) {
      await retryOrThrow(attempt, await apiError(response, options.label), response.headers.get('retry-after'));
      continue;
    }

    let delivered = 0;
    try {
      await readSseEvents(response, options.signal, (event) => {
        onEvent(event);
        delivered += 1;
      });
      return;
    } catch (error) {
      if (delivered > 0 || !(error instanceof SearchApiError)) throw error;
      await retryOrThrow(attempt, error, null);
    }
  }
};
