import type { HistoryTurnDetail } from '@preload/index';

export type TurnDetail = HistoryTurnDetail;

export type TurnActivityItem =
  | {
      id: string;
      text: string;
      type: 'thinking';
      createdAt: number;
      updatedAt: number;
    }
  | {
      id: string;
      type: 'detail';
      detail: TurnDetail;
    };

export type Turn = {
  id: string;
  text: string;
  activity?: string;
  thinking?: string;
  createdAt: number;
  streaming?: boolean;
  details?: TurnDetail[];
  activityItems?: TurnActivityItem[];
  role: 'user' | 'assistant' | 'system' | 'event' | 'terminal';
};
