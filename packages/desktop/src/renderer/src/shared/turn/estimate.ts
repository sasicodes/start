import type { Turn } from '@renderer/utils/types';

const baseHeight = 44;
const lineLength = 86;
const eventHeight = 24;
const textPadding = 16;
const detailHeight = 34;
const textLineHeight = 24;
const attachmentHeight = 62;
const terminalLineHeight = 20;

const estimatedLines = (text: string) => Math.max(1, Math.ceil(text.length / lineLength));

export const estimateTurnHeight = (turn: Turn) => {
  if (turn.role === 'event') return eventHeight;

  const text = turn.text || (turn.role === 'terminal' ? 'Running...' : '');
  const lineHeight = turn.role === 'terminal' ? terminalLineHeight : textLineHeight;
  const bodyHeight = text ? estimatedLines(text) * lineHeight + textPadding : 0;
  const activityItemCount = turn.activityItems?.length ?? 0;
  const activityHeight = activityItemCount
    ? activityItemCount * detailHeight
    : (turn.thinking ? detailHeight : 0) + (turn.details?.length ?? 0) * detailHeight;
  const attachmentsHeight = turn.attachments?.length ? attachmentHeight : 0;

  return Math.max(baseHeight, bodyHeight + activityHeight + attachmentsHeight);
};
