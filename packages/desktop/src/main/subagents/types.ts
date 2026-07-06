import type { ModelScore } from '@main/models';
import type { EffortLevel, SubagentActivity } from '@main/types';

export interface SubagentTaskInput {
  model: string;
  prompt: string;
  effort: EffortLevel;
}

export interface WorkflowModelOption {
  key: string;
  name: string;
  score: ModelScore;
  provider: string;
  effortLevels: EffortLevel[];
}

export interface SubagentRunSnapshot {
  agents: SubagentActivity[];
}

export interface SubagentRunResult extends SubagentRunSnapshot {
  text: string;
}
