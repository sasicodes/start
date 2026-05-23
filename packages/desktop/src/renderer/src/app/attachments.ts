import type { ImageAttachment } from '@preload/index';
import { useCallback, useState } from 'preact/hooks';

export const usePendingAttachments = () => {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);

  const releasePendingAttachments = useCallback((items: ImageAttachment[]) => {
    if (items.length > 0) void window.pi.chat.releaseAttachments(items.map((attachment) => attachment.id));
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setAttachments((current) => {
      releasePendingAttachments(current);
      return [];
    });
  }, [releasePendingAttachments]);

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((current) => {
        const removed = current.find((attachment) => attachment.id === id);
        if (removed) releasePendingAttachments([removed]);
        return current.filter((attachment) => attachment.id !== id);
      });
    },
    [releasePendingAttachments]
  );

  return {
    attachments,
    setAttachments,
    removeAttachment,
    clearPendingAttachments
  };
};
