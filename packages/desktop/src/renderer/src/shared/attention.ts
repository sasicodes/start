import type { AgentTabStatus, SessionNoticeKind, WorkspaceFolder } from '@preload/index';

export type AttentionStatus = Exclude<AgentTabStatus, 'idle'>;
export type AttentionState = AttentionStatus | '';

export const attentionLabel = (status: AttentionState): string => {
  if (status === 'generating') return 'in progress';
  return status;
};

export const attentionStatusCount = (statuses: AttentionState[]): number => statuses.filter((status) => status).length;

export const attentionCountLabel = (count: number): string => (count > 99 ? '99+' : String(count));

export const attentionStatus = (status: AgentTabStatus | undefined, noticeKind?: SessionNoticeKind): AttentionState => {
  if (status && status !== 'idle') return status;
  return noticeKind ?? '';
};

export const sessionAttentionStatus = (
  sessionId: string,
  activeSessionId: string,
  status: AgentTabStatus | undefined,
  noticeKind?: SessionNoticeKind
): AttentionState => {
  if (sessionId === activeSessionId) return '';
  return attentionStatus(status, noticeKind);
};

export const topAttentionStatus = (statuses: AttentionState[]): AttentionState => {
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('generating')) return 'generating';
  if (statuses.includes('completed')) return 'completed';
  return '';
};

export const workspaceFoldersAttention = (folders: WorkspaceFolder[]): { kind: AttentionState; countLabel: string } => {
  const statuses = folders
    .filter((folder) => !folder.active)
    .map((folder) => attentionStatus(folder.status, folder.noticeKind));
  return { kind: topAttentionStatus(statuses), countLabel: attentionCountLabel(attentionStatusCount(statuses)) };
};
