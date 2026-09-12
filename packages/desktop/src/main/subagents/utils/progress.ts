import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import type { SubagentActivity } from '@main/types';

export const subagentProgress = (event: AgentSessionEvent): string => {
  switch (event.type) {
    case 'tool_execution_start':
    case 'tool_execution_update':
      return `Running ${event.toolName}`;
    case 'tool_execution_end':
      return `${event.toolName} ${event.isError ? 'failed' : 'finished'}; waiting for model response`;
    case 'message_start':
      return event.message.role === 'assistant' ? 'Waiting for model response' : '';
    case 'message_update': {
      const update = event.assistantMessageEvent;
      if (update.type === 'thinking_delta') return 'Thinking';
      if (update.type === 'text_delta') return 'Writing response';
      if (update.type === 'toolcall_delta') return 'Preparing tool call';
      return '';
    }
    case 'auto_retry_start':
      return `Retrying model request: ${event.errorMessage.slice(0, 300)}`;
    case 'compaction_start':
      return 'Compacting context';
    case 'compaction_end':
      return 'Waiting for model response';
    default:
      return '';
  }
};

export const subagentResults = (agents: SubagentActivity[]) =>
  agents
    .map((agent) => {
      const lastActivity = agent.activity ? `\nLast activity: ${agent.activity}` : '';
      const silence = agent.lastActivityAt
        ? `\nSeconds since activity: ${Math.max(0, Math.floor((Date.now() - agent.lastActivityAt) / 1000))}`
        : '';
      return `## ${agent.name} (${agent.id})\nStatus: ${agent.status}\nModel: ${agent.model ?? 'unknown'}\nTask: ${agent.task}${lastActivity}${silence}\n${agent.summary ?? 'No result yet.'}`;
    })
    .join('\n\n');
