import { noticeSound } from '@renderer/shared/chat/notice';

describe('notice sound', () => {
  it('uses the done sound for completed sessions', () => {
    expect(noticeSound('completed')).toBe('done');
  });

  it('uses the error sound for failed sessions', () => {
    expect(noticeSound('failed')).toBe('error');
  });
});
