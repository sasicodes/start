import type { ImageAttachment } from '@preload/index';
import { createUserTurn } from '@renderer/functions/chat';

const attachment: ImageAttachment = {
  id: 'image-1',
  name: 'screenshot.png',
  path: '/tmp/screenshot.png',
  type: 'image',
  mimeType: 'image/png',
  previewUrl: 'data:image/png;base64,preview'
};

describe('chat turns', () => {
  it('keeps sent image attachments on user turns', () => {
    expect(createUserTurn('look at this', [attachment])).toMatchObject({
      text: 'look at this',
      role: 'user',
      attachments: [attachment]
    });
  });

  it('omits attachments from plain user turns', () => {
    expect(createUserTurn('hello')).not.toHaveProperty('attachments');
  });
});
