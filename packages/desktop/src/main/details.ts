import type { ChatEvent, HistoryTurnDetail, ImageAttachment } from '@main/types';
import * as v from 'valibot';

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

const textPartSchema = v.object({
  text: v.string(),
  type: v.literal('text')
});

const imagePartSchema = v.object({
  data: v.string(),
  type: v.literal('image'),
  mimeType: v.optional(v.string())
});

const joinedParts = (parts: readonly unknown[], partText: (part: unknown) => string) =>
  parts.map(partText).filter(Boolean).join('\n').trim();

export const textContent = (content: unknown) => {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return joinedParts(content, (part) => {
    if (!isRecord(part)) return '';

    const type = stringValue(part.type);
    if (type === 'text') return stringValue(part.text);
    if (type !== 'image') return '';

    const mimeType = stringValue(part.mimeType);
    return mimeType ? `[image: ${mimeType}]` : '[image]';
  });
};

export const textOnlyContent = (content: unknown) => {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return joinedParts(content, (part) => {
    const result = v.safeParse(textPartSchema, part);
    return result.success ? result.output.text : '';
  });
};

export const imageAttachments = (content: unknown, turnId: string): ImageAttachment[] => {
  if (!Array.isArray(content)) return [];

  return content.flatMap((part, index): ImageAttachment[] => {
    const result = v.safeParse(imagePartSchema, part);
    if (!result.success || !result.output.data) return [];

    const mimeType = result.output.mimeType || 'image/png';
    return [
      {
        path: '',
        mimeType,
        name: 'image',
        type: 'image',
        id: `${turnId}:image:${index}`,
        previewUrl: `data:${mimeType};base64,${result.output.data}`
      }
    ];
  });
};

export const thinkingContent = (content: unknown) => {
  if (!Array.isArray(content)) return '';

  return joinedParts(content, (part) => {
    if (!isRecord(part)) return '';
    if (stringValue(part.type) !== 'thinking') return '';

    const thinking = stringValue(part.thinking);
    if (thinking) return thinking;
    return booleanValue(part.redacted) ? '[redacted thinking]' : '';
  });
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
