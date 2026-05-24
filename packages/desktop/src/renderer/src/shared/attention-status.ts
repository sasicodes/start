import type { AgentTabStatus, SessionNoticeKind } from '@preload/index';

export type AttentionStatus = Exclude<AgentTabStatus, 'idle'>;
export type AttentionState = AttentionStatus | '';

export const attentionStatus = (status: AgentTabStatus | undefined, noticeKind?: SessionNoticeKind): AttentionState => {
  if (status && status !== 'idle') return status;
  return noticeKind ?? '';
};

export const topAttentionStatus = (statuses: AttentionState[]): AttentionState => {
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('generating')) return 'generating';
  if (statuses.includes('completed')) return 'completed';
  return '';
};
