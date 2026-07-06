import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import type { ModelScore } from '@main/models';
import type { EffortLevel, SubagentActivity } from '@main/types';

export type ResolvedModel = ModelRegistry['getAvailable'] extends () => Array<infer ModelItem> ? ModelItem : never;

export interface SubagentTaskInput {
  model: string;
  prompt: string;
  effort: EffortLevel;
}

export interface WorkflowModelOption {
  key: string;
  name: string;
  provider: string;
  score: ModelScore;
  effortLevels: EffortLevel[];
}

export interface SubagentRunSnapshot {
  agents: SubagentActivity[];
}

export interface SubagentRunResult extends SubagentRunSnapshot {
  text: string;
}
