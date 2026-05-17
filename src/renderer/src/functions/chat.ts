import { createId } from '@renderer/utils/id';
import type { ChatMessage } from '@renderer/utils/types';

export const createMessage = (role: ChatMessage['role'], text: string): ChatMessage => {
  return {
    id: createId(),
    role,
    text,
    createdAt: Date.now()
  };
};
