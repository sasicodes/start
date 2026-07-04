import type { Turn } from '@renderer/utils/types';

const baseHeight = 44;
const lineLength = 86;
const eventHeight = 24;
const textPadding = 16;
const textLineHeight = 24;
const attachmentHeight = 62;
const terminalLineHeight = 20;
const activityHeaderHeight = 30;

const estimatedLines = (text: string) => Math.max(1, Math.ceil(text.length / lineLength));

export const estimateTurnHeight = (turn: Turn) => {
  if (turn.role === 'event') return eventHeight;

  const text = turn.text || (turn.role === 'terminal' ? 'Running...' : '');
  const lineHeight = turn.role === 'terminal' ? terminalLineHeight : textLineHeight;
  const bodyHeight = text ? estimatedLines(text) * lineHeight + textPadding : 0;
  const hasActivity =
    (turn.activityItems?.length ?? 0) > 0 || Boolean(turn.thinking) || (turn.details?.length ?? 0) > 0;
  const activityHeight = hasActivity ? activityHeaderHeight : 0;
  const attachmentsHeight = turn.attachments?.length ? attachmentHeight : 0;

  return Math.max(baseHeight, bodyHeight + activityHeight + attachmentsHeight);
};
