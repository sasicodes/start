import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import { countLabel, stringValue, textContent } from '@main/details';
import { toolEventDetail } from '@main/tools/details';
import type { ChatEvent } from '@main/types';

const metadataEvent = (key: string, title: string, state: ChatEvent['state'] = 'done'): ChatEvent => ({
  key,
  state,
  title,
  kind: 'metadata'
});

const errorEvent = (key: string, title: string): ChatEvent => ({
  key,
  title,
  kind: 'error',
  state: 'error'
});

const withDetail = (event: ChatEvent, detail: string) => {
  if (detail) event.detail = detail;
  return event;
};

const withMetric = (event: ChatEvent, metric: string) => {
  if (metric) event.metric = metric;
  return event;
};

const streamDetail = (event: Extract<AgentSessionEvent, { type: 'message_update' }>) => {
  const update = event.assistantMessageEvent;

  if (update.type === 'error')
    return withDetail(errorEvent('message-error', 'Response stopped'), update.error.errorMessage ?? update.reason);
  if (update.type === 'done' && update.reason === 'length')
    return metadataEvent('message-limit', 'Reached length limit');
  if (update.type !== 'toolcall_end') return;

  return toolEventDetail({
    state: 'active',
    toolName: update.toolCall.name,
    args: update.toolCall.arguments,
    key: `tool:${update.toolCall.id}`
  });
};

const customMessageEvent = (event: Extract<AgentSessionEvent, { type: 'message_end' }>) => {
  const message = event.message;
  if (message.role !== 'custom') return;
  if (!message.display) return;

  const body = textContent(message.content);
  if (!body) return;

  const customMessageType = stringValue(message.customType);
  const result = metadataEvent(`custom:${customMessageType || 'message'}:${message.timestamp}`, 'Agent message');
  if (customMessageType) result.detail = customMessageType;
  result.body = body;
  return result;
};

export type ChatEventContext = {
  toolArgs?: unknown;
};

export const chatEvent = (event: AgentSessionEvent, context: ChatEventContext = {}): ChatEvent | undefined => {
  switch (event.type) {
    case 'message_update':
      return streamDetail(event);
    case 'tool_execution_start':
      return toolEventDetail({
        args: event.args,
        state: 'active',
        toolName: event.toolName,
        key: `tool:${event.toolCallId}`
      });
    case 'tool_execution_update':
      return toolEventDetail({
        args: event.args,
        state: 'active',
        toolName: event.toolName,
        key: `tool:${event.toolCallId}`,
        result: event.partialResult
      });
    case 'tool_execution_end':
      return toolEventDetail({
        result: event.result,
        toolName: event.toolName,
        args: context.toolArgs ?? {},
        key: `tool:${event.toolCallId}`,
        state: event.isError ? 'error' : 'done'
      });
    case 'queue_update': {
      const queuedCount = event.steering.length + event.followUp.length;
      if (queuedCount === 0) return;

      const result = metadataEvent('queue', 'Queued follow-up work', 'queued');
      result.detail = `${countLabel(event.steering.length, 'steer')}, ${countLabel(event.followUp.length, 'follow-up')}`;
      return result;
    }
    case 'compaction_start':
      return metadataEvent('compaction', 'Compacting context', 'active');
    case 'compaction_end': {
      const title = event.aborted ? 'Compaction cancelled' : 'Compacted context';
      const result = event.errorMessage
        ? errorEvent('compaction', 'Compaction failed')
        : metadataEvent('compaction', title);
      withDetail(result, event.errorMessage ?? event.reason);
      if (event.willRetry) result.metric = 'will retry';
      return result;
    }
    case 'auto_retry_start': {
      const result = metadataEvent('retry', 'Retrying request', 'active');
      result.detail = event.errorMessage;
      result.metric = `${event.attempt}/${event.maxAttempts}`;
      return result;
    }
    case 'auto_retry_end': {
      const result = event.success
        ? metadataEvent('retry', 'Recovered after retry')
        : errorEvent('retry', 'Retry failed');
      result.metric = String(event.attempt);
      return withDetail(result, event.finalError ?? '');
    }
    case 'session_info_changed':
      return withDetail(metadataEvent('session-info', 'Renamed session'), event.name ?? 'Untitled');
    case 'thinking_level_changed':
      return withMetric(metadataEvent('thinking-level', 'Changed thinking level'), event.level);
    case 'message_end':
      return customMessageEvent(event);
    case 'agent_end':
    case 'agent_start':
    case 'message_start':
    case 'turn_end':
    case 'turn_start':
      return;
  }
};
