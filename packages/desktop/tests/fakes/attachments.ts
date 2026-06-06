import type { ImageAttachment, PreparedDropFiles } from '@main/types';

export interface PreparedImageAttachment extends ImageAttachment {
  data: string;
}

export interface PreparedFiles extends Omit<PreparedDropFiles, 'attachments'> {
  attachments: PreparedImageAttachment[];
}

export const stripAttachmentData = (attachment: PreparedImageAttachment): ImageAttachment => ({
  id: attachment.id,
  name: attachment.name,
  path: attachment.path,
  type: attachment.type,
  mimeType: attachment.mimeType,
  previewUrl: attachment.previewUrl
});

export const prepareClipboardImage = async (): Promise<PreparedImageAttachment | null> => null;

export const prepareDroppedFiles = async (paths: string[]): Promise<PreparedFiles> => ({
  pathTokens: [],
  attachments: paths.map((path, index) => ({
    path,
    type: 'image',
    id: `attach-${index}`,
    data: `base64-${index}`,
    name: `image-${index}.png`,
    mimeType: 'image/png',
    previewUrl: `data:image/png;base64,preview-${index}`
  }))
});
