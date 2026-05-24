import { describe, expect, it, vi } from 'vitest';
import { freshChatService } from '../helpers/chat-service.js';

vi.mock('@main/attachments', () => {
  let counter = 0;
  return {
    stripAttachmentData: (attachment: { id: string; name: string; path: string }) => ({
      id: attachment.id,
      name: attachment.name,
      path: attachment.path,
      type: 'image' as const,
      mimeType: 'image/png',
      previewUrl: `data:image/png;base64,preview-${attachment.id}`
    }),
    prepareClipboardImage: async () => null,
    prepareDroppedFiles: async (paths: string[]) => {
      counter += 1;
      return {
        pathTokens: [],
        attachments: paths.map((path, index) => ({
          id: `attach-${counter}-${index}`,
          name: `dropped-${counter}-${index}.png`,
          path,
          type: 'image' as const,
          mimeType: 'image/png',
          previewUrl: '',
          data: 'base64-bytes'
        }))
      };
    }
  };
});

describe('attachments', () => {
  it('stores dropped image attachments and returns sanitized metadata to the renderer', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const dropped = await chat.prepareDroppedFiles(['/tmp/example.png']);
    expect(dropped.attachments).toHaveLength(1);
    const attachment = dropped.attachments[0];
    expect(attachment?.previewUrl).toContain('preview-');
    expect('data' in (attachment ?? {})).toBe(false);
  });

  it('drops attachments from memory when their ids are released', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const dropped = await chat.prepareDroppedFiles(['/tmp/example.png']);
    const id = dropped.attachments[0]?.id;
    expect(id).toBeDefined();
    if (id) chat.releaseAttachments([id]);
    expect(() => chat.releaseAttachments([id ?? ''])).not.toThrow();
  });
});
