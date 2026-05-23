import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import { countLabel } from '@main/details';
import { toolEventDetail } from '@main/tool-details';
import type { ChatEvent } from '@main/types';

const metadataEvent = (key: string, title: string, state: ChatEvent['state'] = 'done'): ChatEvent => ({
  key,
  kind: 'metadata',
  title,
  state
});

const errorEvent = (key: string, title: string): ChatEvent => ({
  key,
  kind: 'error',
  title,
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
  if (update.type !== 'toolcall_end') return undefined;

  return toolEventDetail({
    state: 'active',
    args: update.toolCall.arguments,
    key: `tool:${update.toolCall.id}`,
    toolName: update.toolCall.name
  });
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
        result: event.partialResult,
        state: 'active',
        toolName: event.toolName,
        key: `tool:${event.toolCallId}`
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
      if (queuedCount === 0) return undefined;

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
    case 'agent_end':
    case 'agent_start':
    case 'message_end':
    case 'message_start':
    case 'turn_end':
    case 'turn_start':
      return undefined;
  }
};
