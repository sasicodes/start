import type { SessionNoticeKind } from '@preload/index';

export type NoticeSound = 'done' | 'error';

export const noticeSound = (kind: SessionNoticeKind): NoticeSound => (kind === 'failed' ? 'error' : 'done');
