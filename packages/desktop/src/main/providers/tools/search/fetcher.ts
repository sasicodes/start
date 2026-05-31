import type { SseEvent } from '@main/providers/tools/search/types';

const maxSseBytes = 2_000_000;
const maxSseEvents = 1_000;

interface PostSseOptions {
  url: string;
  body: unknown;
  label: string;
  signal: AbortSignal | null;
  headers: Record<string, string>;
}

const responseText = async (response: Response) => {
  try {
    return await response.text();
  } catch {
    return '';
  }
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
      if (signal?.aborted) throw new Error('Web search cancelled.');
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
  const response = await fetch(options.url, {
    body: JSON.stringify(options.body),
    headers: options.headers,
    method: 'POST',
    ...(options.signal ? { signal: options.signal } : {})
  });
  if (!response.ok) throw new Error(`${options.label} API error (${response.status}): ${await responseText(response)}`);
  await readSseEvents(response, options.signal, onEvent);
};
