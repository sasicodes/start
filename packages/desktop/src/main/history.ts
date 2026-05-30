import {
  booleanValue,
  countLabel,
  historyDetail,
  isRecord,
  numberValue,
  previewValue,
  stringValue,
  textContent,
  thinkingContent,
  timestampValue
} from '@main/details';
import { combineHistoryTurns } from '@main/history/combine';
import { codeBlock, toolBody, toolEventDetail, toolResultTitle } from '@main/tools/details';
import type { ChatEvent, HistoryTurn, HistoryTurnDetail } from '@main/types';

type HistoryToolCall = {
  args: unknown;
  toolName: string;
};

type HistoryContext = {
  resultToolCallIds: Set<string>;
  toolCalls: Map<string, HistoryToolCall>;
};

const entryId = (entry: Record<string, unknown>) => stringValue(entry.id) || `entry:${timestampValue(entry.timestamp)}`;

const baseTurn = (entry: Record<string, unknown>, role: HistoryTurn['role'], text = ''): HistoryTurn => ({
  role,
  text,
  id: entryId(entry),
  createdAt: timestampValue(entry.timestamp)
});

const compactEvent = (key: string, title: string, body = ''): ChatEvent => {
  const event: ChatEvent = {
    key,
    state: 'done',
    title,
    kind: 'metadata'
  };

  if (body) event.body = body;
  return event;
};

const detailTurn = (entry: Record<string, unknown>, event: ChatEvent): HistoryTurn[] => {
  const createdAt = timestampValue(entry.timestamp);
  const turn = baseTurn(entry, event.kind === 'tool' ? 'terminal' : 'event');
  turn.details = [historyDetail(event, 0, turn.id, createdAt)];
  return [turn];
};

const assistantDetails = (entryIdValue: string, createdAt: number, content: unknown, context: HistoryContext) => {
  if (!Array.isArray(content)) return [];

  return content.flatMap((part, index): HistoryTurnDetail[] => {
    if (!isRecord(part)) return [];
    if (stringValue(part.type) !== 'toolCall') return [];

    const id = stringValue(part.id) || `${entryIdValue}:${index}`;
    const name = stringValue(part.name) || 'tool';
    context.toolCalls.set(id, { args: part.arguments, toolName: name });
    if (context.resultToolCallIds.has(id)) return [];

    const event = toolEventDetail({
      state: 'done',
      toolName: name,
      key: `tool:${id}`,
      args: part.arguments
    });
    return [historyDetail(event, index, entryIdValue, createdAt)];
  });
};

const assistantTurn = (entry: Record<string, unknown>, message: Record<string, unknown>, context: HistoryContext) => {
  const createdAt = timestampValue(entry.timestamp);
  const id = entryId(entry);
  const details = assistantDetails(id, createdAt, message.content, context);
  const thinking = thinkingContent(message.content);
  const text = textContent(message.content);

  if (!text && !thinking && details.length === 0) return [];

  const turn: HistoryTurn = {
    id,
    text,
    createdAt,
    role: 'assistant'
  };
  if (details.length > 0) turn.details = details;
  if (thinking) turn.thinking = thinking;
  return [turn];
};

const bashTurn = (entry: Record<string, unknown>, message: Record<string, unknown>) => {
  const command = stringValue(message.command);
  const output = stringValue(message.output);
  const status = booleanValue(message.cancelled) ? 'cancelled' : '';
  const truncated = booleanValue(message.truncated) ? 'truncated' : '';
  const exitCode =
    typeof message.exitCode === 'number' && Number.isFinite(message.exitCode) ? `exit ${message.exitCode}` : '';
  const body = [output ? codeBlock(output, 'bash') : '', [status, exitCode, truncated].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  const event: ChatEvent = {
    key: `bash:${entryId(entry)}`,
    state: 'done',
    title: 'Ran command',
    kind: 'tool'
  };

  if (body) event.body = body;
  if (command) event.detail = codeBlock(command, 'bash');
  return detailTurn(entry, event);
};

const customTurn = (entry: Record<string, unknown>, message: Record<string, unknown>) => {
  if (message.display === false) return [];

  const text = textContent(message.content);
  if (!text) return [];

  const customMessageType = stringValue(message.customType);
  const event = compactEvent(`custom:${entryId(entry)}`, 'Agent message', text);
  if (customMessageType) event.detail = customMessageType;
  return detailTurn(entry, event);
};

const toolResultTurn = (entry: Record<string, unknown>, message: Record<string, unknown>, context: HistoryContext) => {
  const id = stringValue(message.toolCallId);
  const toolCall = context.toolCalls.get(id || '');
  const toolName = stringValue(message.toolName) || toolCall?.toolName || 'tool';
  const error = booleanValue(message.isError);
  const key = id ? `tool:${id}` : `tool-result:${entryId(entry)}`;

  if (toolCall) {
    return detailTurn(
      entry,
      toolEventDetail({
        key,
        toolName,
        result: message,
        args: toolCall.args,
        state: error ? 'error' : 'done'
      })
    );
  }

  const body = toolBody(toolName, {}, message);
  const event: ChatEvent = {
    key,
    title: toolResultTitle(toolName, error),
    kind: error ? 'error' : 'tool',
    state: error ? 'error' : 'done'
  };

  if (body) event.body = body;
  return detailTurn(entry, event);
};

const userTurn = (entry: Record<string, unknown>, message: Record<string, unknown>) => {
  const text = textContent(message.content);
  return text ? [baseTurn(entry, 'user', text)] : [];
};

const branchSummaryTurn = (entry: Record<string, unknown>, message: Record<string, unknown>) => {
  return detailTurn(entry, compactEvent(`branch:${entryId(entry)}`, 'Summarized branch', stringValue(message.summary)));
};

const compactionTitle = (tokensBefore: number) => {
  return tokensBefore > 0 ? `Compacted context from ${countLabel(tokensBefore, 'token')}` : 'Compacted context';
};

const compactionTurn = (entry: Record<string, unknown>, summary: string, tokensBefore: number) => {
  return detailTurn(entry, compactEvent(`compaction:${entryId(entry)}`, compactionTitle(tokensBefore), summary));
};

const compactionSummaryTurn = (entry: Record<string, unknown>, message: Record<string, unknown>) => {
  return compactionTurn(entry, stringValue(message.summary), numberValue(message.tokensBefore));
};

const messageTurns = (entry: Record<string, unknown>, context: HistoryContext) => {
  if (!isRecord(entry.message)) return [];

  const role = stringValue(entry.message.role);
  if (role === 'assistant') return assistantTurn(entry, entry.message, context);
  if (role === 'bashExecution') return bashTurn(entry, entry.message);
  if (role === 'branchSummary') return branchSummaryTurn(entry, entry.message);
  if (role === 'compactionSummary') return compactionSummaryTurn(entry, entry.message);
  if (role === 'custom') return customTurn(entry, entry.message);
  if (role === 'toolResult') return toolResultTurn(entry, entry.message, context);
  if (role === 'user') return userTurn(entry, entry.message);
  return [];
};

const customEntryTurn = (entry: Record<string, unknown>) => {
  const customType = stringValue(entry.customType);
  const data = previewValue(entry.data);
  if (!customType && !data) return [];

  return detailTurn(entry, compactEvent(`custom-entry:${entryId(entry)}`, customType || 'Custom state', data));
};

const customMessageTurn = (entry: Record<string, unknown>) => {
  if (entry.display === false) return [];

  const content = textContent(entry.content);
  if (!content) return [];

  const customMessageType = stringValue(entry.customType);
  const event = compactEvent(`custom-message:${entryId(entry)}`, 'Agent message', content);
  if (customMessageType) event.detail = customMessageType;
  return detailTurn(entry, event);
};

const labelTurn = (entry: Record<string, unknown>) => {
  const label = stringValue(entry.label);
  const target = stringValue(entry.targetId);
  const title = label ? `Labeled ${target || 'entry'}` : `Cleared label${target ? ` on ${target}` : ''}`;
  return detailTurn(entry, compactEvent(`label:${entryId(entry)}`, title, label));
};

const metadataTurn = (entry: Record<string, unknown>) => {
  const type = stringValue(entry.type);
  if (type === 'branch_summary')
    return detailTurn(entry, compactEvent(`branch:${entryId(entry)}`, 'Summarized branch', stringValue(entry.summary)));
  if (type === 'custom') return customEntryTurn(entry);
  if (type === 'custom_message') return customMessageTurn(entry);
  if (type === 'label') return labelTurn(entry);
  if (type === 'session_info')
    return detailTurn(entry, compactEvent(`session:${entryId(entry)}`, 'Renamed session', stringValue(entry.name)));
  if (type === 'thinking_level_change')
    return detailTurn(
      entry,
      compactEvent(`thinking:${entryId(entry)}`, `Thinking level: ${stringValue(entry.thinkingLevel)}`)
    );

  if (type === 'model_change') {
    const model = [stringValue(entry.provider), stringValue(entry.modelId)].filter(Boolean).join('/');
    return model ? detailTurn(entry, compactEvent(`model:${entryId(entry)}`, `Model changed: ${model}`)) : [];
  }

  if (type !== 'compaction') return [];

  return compactionTurn(entry, stringValue(entry.summary), numberValue(entry.tokensBefore));
};

const collectResultToolCallIds = (entries: readonly unknown[]) => {
  const ids = new Set<string>();

  for (const entry of entries) {
    if (!isRecord(entry) || entry.type !== 'message' || !isRecord(entry.message)) continue;
    if (stringValue(entry.message.role) !== 'toolResult') continue;

    const id = stringValue(entry.message.toolCallId);
    if (id) ids.add(id);
  }

  return ids;
};

export const historyTurns = (entries: readonly unknown[]): HistoryTurn[] => {
  const context: HistoryContext = {
    toolCalls: new Map(),
    resultToolCallIds: collectResultToolCallIds(entries)
  };
  const turns = entries.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    if (entry.type === 'message') return messageTurns(entry, context);
    return metadataTurn(entry);
  });

  return combineHistoryTurns(turns);
};
