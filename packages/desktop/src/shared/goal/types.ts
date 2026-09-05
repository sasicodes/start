export interface GoalStatus {
  elapsedMs: number;
  startedAt?: number;
  objective: string;
  iterations: number;
  reason?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export type GoalAction = 'pause' | 'resume' | 'cancel';
