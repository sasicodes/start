import type { Api, Model } from '@earendil-works/pi-ai';
import type { ModelScore } from '@main/models';
import type { EffortLevel, SubagentActivity } from '@main/types';

export type ResolvedModel = Model<Api>;

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
