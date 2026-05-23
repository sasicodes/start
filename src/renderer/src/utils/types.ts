import type { HistoryTurnDetail } from '@preload/index';

export type TurnDetail = HistoryTurnDetail;

export type Turn = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'event' | 'terminal';
  text: string;
  activity?: string;
  details?: TurnDetail[];
  thinking?: string;
  streaming?: boolean;
  createdAt: number;
};
