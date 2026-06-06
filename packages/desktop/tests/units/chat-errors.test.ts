import { shouldCompleteAfterStreamError } from '@main/chat/errors';

describe('chat stream errors', () => {
  it('treats provider connection errors after visible output as completed', () => {
    expect(
      shouldCompleteAfterStreamError(
        { text: 'Done.', thinking: '' },
        'upstream connect error or disconnect/reset before headers. retried and the latest reset reason: remote connection failure, transport failure reason: delayed connect error: Connection refused'
      )
    ).toBe(true);
  });

  it('keeps provider connection errors fatal before any visible output', () => {
    expect(
      shouldCompleteAfterStreamError(
        { text: '', thinking: '' },
        'upstream connect error or disconnect/reset before headers. retried and the latest reset reason: remote connection failure'
      )
    ).toBe(false);
  });

  it('keeps non-transport errors fatal even after visible output', () => {
    expect(shouldCompleteAfterStreamError({ text: 'Partial answer.', thinking: '' }, 'Model context limit exceeded')).toBe(
      false
    );
  });
});
