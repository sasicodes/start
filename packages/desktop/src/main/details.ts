import type { ChatEvent, HistoryTurnDetail } from '@main/types';

const previewMaxLength = 150;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const stringValue = (value: unknown) => (typeof value === 'string' && value ? value : '');

export const booleanValue = (value: unknown) => typeof value === 'boolean' && value;

export const numberValue = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export const timestampValue = (value: unknown) => {
  const timestamp = stringValue(value);
  if (!timestamp) return 0;

  const time = Date.parse(timestamp);
  return Number.isFinite(time) ? time : 0;
};

export const countLabel = (count: number, singular: string) => `${count} ${singular}${count === 1 ? '' : 's'}`;

const truncate = (value: string, maxLength = previewMaxLength) => {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
};

const summarizeValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return truncate(value, 90);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (value === undefined) return '';
  if (depth > 1) return Array.isArray(value) ? `[${value.length} items]` : '[object]';
  if (Array.isArray(value)) {
    const summary = value.slice(0, 3).map((item) => summarizeValue(item, depth + 1));
    return value.length > 3 ? [...summary, `+${value.length - 3} more`] : summary;
  }
  if (!isRecord(value)) return truncate(String(value));

  const entries = Object.entries(value);
  const summary: Record<string, unknown> = {};

  for (const [key, item] of entries.slice(0, 5)) {
    summary[key] = summarizeValue(item, depth + 1);
  }

  if (entries.length > 5) summary.more = `+${entries.length - 5} fields`;
  return summary;
};

export const previewValue = (value: unknown) => {
  if (value === undefined) return '';

  try {
    const summary = summarizeValue(value);
    if (typeof summary === 'string') return truncate(summary);
    return truncate(JSON.stringify(summary));
  } catch {
    return truncate(String(value));
  }
};

export const textContent = (content: unknown) => {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .flatMap((part) => {
      if (!isRecord(part)) return [];

      const type = stringValue(part.type);
      if (type === 'text') {
        const text = stringValue(part.text);
        return text ? [text] : [];
      }
      if (type !== 'image') return [];

      const mimeType = stringValue(part.mimeType);
      return [mimeType ? `[image: ${mimeType}]` : '[image]'];
    })
    .join('\n')
    .trim();
};

export const thinkingContent = (content: unknown) => {
  if (!Array.isArray(content)) return '';

  return content
    .flatMap((part) => {
      if (!isRecord(part)) return [];
      if (stringValue(part.type) !== 'thinking') return [];

      const thinking = stringValue(part.thinking);
      if (thinking) return [thinking];
      return booleanValue(part.redacted) ? ['[redacted thinking]'] : [];
    })
    .join('\n')
    .trim();
};

export const historyDetail = (
  event: ChatEvent,
  index: number,
  turnId: string,
  createdAt: number
): HistoryTurnDetail => ({
  ...event,
  id: `${turnId}:detail:${index}`,
  count: 1,
  createdAt,
  updatedAt: createdAt
});
