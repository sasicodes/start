import type { ChatEvent, HistoryTurnDetail, TurnDetailState } from '@main/types';

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

const detailValue = (event: ChatEvent, value: string) => {
  if (value) event.detail = value;
  return event;
};

const metricValue = (event: ChatEvent, value: string) => {
  if (value) event.metric = value;
  return event;
};

const bodyValue = (event: ChatEvent, value: string) => {
  if (value) event.body = value;
  return event;
};

const recordPath = (args: Record<string, unknown>) => stringValue(args.path) || '.';

const diffMarkdown = (details: unknown) => {
  if (!isRecord(details)) return '';

  const diff = stringValue(details.diff);
  return diff ? `\`\`\`diff\n${diff}\n\`\`\`` : '';
};

const toolBody = (toolName: string, result: unknown) => {
  if (!isRecord(result)) return '';

  const content = textContent(result.content);
  const diff = toolName === 'edit' ? diffMarkdown(result.details) : '';
  return [content, diff].filter(Boolean).join('\n\n').trim();
};

const toolDetail = (toolName: string, args: Record<string, unknown>) => {
  if (toolName === 'bash') return stringValue(args.command);
  if (toolName === 'find') return stringValue(args.pattern);
  if (toolName === 'grep') return stringValue(args.pattern);
  return recordPath(args);
};

const toolMetric = (toolName: string, args: Record<string, unknown>) => {
  if (toolName === 'edit' && Array.isArray(args.edits)) return countLabel(args.edits.length, 'edit');
  if (toolName === 'write') return countLabel(stringValue(args.content).length, 'byte');
  if (toolName === 'read' && numberValue(args.limit) > 0) return countLabel(numberValue(args.limit), 'line');
  return '';
};

const toolTitle = (toolName: string, args: Record<string, unknown>, state: TurnDetailState) => {
  const path = recordPath(args);
  const pattern = stringValue(args.pattern);
  const failed = state === 'error';

  if (failed) return `${toolName} failed`;
  if (toolName === 'bash') return state === 'active' ? 'Running command' : 'Ran command';
  if (toolName === 'edit') return `${state === 'active' ? 'Editing' : 'Edited'} file ${path}`;
  if (toolName === 'find')
    return `${state === 'active' ? 'Finding' : 'Found'} files${pattern ? ` matching ${pattern}` : ''}`;
  if (toolName === 'grep')
    return `${state === 'active' ? 'Searching' : 'Searched'} files${pattern ? ` for ${pattern}` : ''}`;
  if (toolName === 'read') return `${state === 'active' ? 'Reviewing' : 'Reviewed'} file ${path}`;
  if (toolName === 'write') return `${state === 'active' ? 'Writing' : 'Wrote'} file ${path}`;
  if (toolName === 'ls') return `${state === 'active' ? 'Exploring' : 'Explored'} folder ${path}`;
  return `${state === 'active' ? 'Using' : 'Used'} ${toolName}`;
};

export const toolEventDetail = ({
  key,
  args,
  state,
  result,
  toolName
}: {
  key: string;
  args: unknown;
  state: TurnDetailState;
  result?: unknown;
  toolName: string;
}): ChatEvent => {
  const safeArgs = isRecord(args) ? args : {};
  const detail = toolDetail(toolName, safeArgs);
  const metric = toolMetric(toolName, safeArgs);
  const body = toolBody(toolName, result);
  const event: ChatEvent = {
    key,
    kind: state === 'error' ? 'error' : 'tool',
    title: toolTitle(toolName, safeArgs, state),
    state
  };

  bodyValue(event, body);
  detailValue(event, detail);
  metricValue(event, metric);
  return event;
};
