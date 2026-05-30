import type { SubagentActivity } from '@main/types';

export interface SubagentTaskInput {
  prompt: string;
}

export interface SubagentRunSnapshot {
  agents: SubagentActivity[];
}

export interface SubagentRunResult extends SubagentRunSnapshot {
  text: string;
}
