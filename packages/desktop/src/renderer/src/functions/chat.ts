import type { ImageAttachment } from '@preload/index';
import { createId } from '@renderer/utils/id';
import type { Turn } from '@renderer/utils/types';

export const createTurn = (role: Turn['role'], text: string): Turn => {
  return {
    id: createId(),
    role,
    text,
    createdAt: Date.now()
  };
};

export const createUserTurn = (text: string, attachments: ImageAttachment[] = []): Turn => ({
  ...createTurn('user', text),
  ...(attachments.length > 0 ? { attachments } : {})
});
