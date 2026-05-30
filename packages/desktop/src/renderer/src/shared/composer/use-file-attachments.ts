import type { ImageAttachment, PreparedDropFiles } from '@preload/index';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

type DraftSetter = (value: string | ((current: string) => string)) => void;
type AttachmentSetter = (value: ImageAttachment[] | ((current: ImageAttachment[]) => ImageAttachment[])) => void;

interface UseFileAttachmentsOptions {
  enabled: boolean;
  setDraft: DraftSetter;
  textareaRef: RefObject<HTMLTextAreaElement>;
  setAttachments: AttachmentSetter;
}

const supportedClipboardImageTypes = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);

const appendPaths = (draft: string, paths: string[]) => {
  if (paths.length === 0) return draft;

  const prefix = draft.length > 0 && !/\s$/.test(draft) ? ' ' : '';
  const separator = paths.length > 1 ? '\n' : ' ';
  return `${draft}${prefix}${paths.join(separator)} `;
};

const distinctPaths = (paths: string[]) => [...new Set(paths.filter((path) => path.length > 0))];

const releaseAttachments = (attachments: ImageAttachment[]) => {
  if (attachments.length > 0) {
    window.pi.chat.releaseAttachments(attachments.map((attachment) => attachment.id)).catch(() => {});
  }
};

const filePath = (file: File) => {
  const fallbackPath = (file as File & { path?: unknown }).path;
  if (typeof fallbackPath === 'string' && fallbackPath) return fallbackPath;

  try {
    return window.pi.app.filePath(file);
  } catch {
    return '';
  }
};

const hasFiles = (event: DragEvent) => {
  const transfer = event.dataTransfer;
  if (!transfer) return false;
  if (Array.from(transfer.types).includes('Files')) return true;
  return Array.from(transfer.items).some((item) => item.kind === 'file');
};

const clipboardFiles = (event: ClipboardEvent) => {
  const transfer = event.clipboardData;
  return transfer ? Array.from(transfer.files) : [];
};

const clipboardHasSupportedImage = (event: ClipboardEvent) => {
  const transfer = event.clipboardData;
  if (!transfer) return false;
  return Array.from(transfer.items).some(
    (item) => item.kind === 'file' && supportedClipboardImageTypes.has(item.type.toLowerCase())
  );
};

export const useFileAttachments = ({ enabled, setDraft, textareaRef, setAttachments }: UseFileAttachmentsOptions) => {
  const dragDepthRef = useRef(0);
  const enabledRef = useRef(enabled);
  const [dropActive, setDropActive] = useState(false);

  enabledRef.current = enabled;

  const applyAttachments = useCallback(
    (attachments: ImageAttachment[]) => {
      if (attachments.length === 0) return;

      setAttachments((current) => {
        const seenPaths = new Set(current.map((attachment) => attachment.path));
        const duplicates = attachments.filter((attachment) => seenPaths.has(attachment.path));
        const nextAttachments = attachments.filter((attachment) => !seenPaths.has(attachment.path));
        releaseAttachments(duplicates);
        return nextAttachments.length > 0 ? [...current, ...nextAttachments] : current;
      });
    },
    [setAttachments]
  );

  const applyPathTokens = useCallback(
    (pathTokens: string[]) => {
      if (pathTokens.length > 0) setDraft((current) => appendPaths(current, pathTokens));
    },
    [setDraft]
  );

  const resetDrop = useCallback(() => {
    dragDepthRef.current = 0;
    setDropActive(false);
  }, []);

  useEffect(() => {
    return () => {
      enabledRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) resetDrop();
  }, [enabled, resetDrop]);

  const preparePaths = useCallback(
    async (paths: string[]) => {
      if (!enabledRef.current) return;

      const nextPaths = distinctPaths(paths);
      if (nextPaths.length === 0) return;

      let result: PreparedDropFiles;
      try {
        result = await window.pi.chat.prepareDroppedFiles(nextPaths);
      } catch {
        return;
      }

      if (!enabledRef.current) {
        releaseAttachments(result.attachments);
        return;
      }

      applyAttachments(result.attachments);
      applyPathTokens(result.pathTokens);
      textareaRef.current?.focus();
    },
    [applyAttachments, applyPathTokens, textareaRef]
  );

  const prepareClipboardImage = useCallback(async () => {
    if (!enabledRef.current) return;

    let attachment: ImageAttachment | null;
    try {
      attachment = await window.pi.chat.prepareClipboardImage();
    } catch {
      return;
    }

    if (!enabledRef.current) {
      if (attachment) releaseAttachments([attachment]);
      return;
    }

    if (attachment) applyAttachments([attachment]);
    textareaRef.current?.focus();
  }, [applyAttachments, textareaRef]);

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled || !hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setDropActive(true);
    },
    [enabled]
  );

  const onDragLeave = useCallback(
    (event: DragEvent) => {
      if (!enabled || !dropActive) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setDropActive(false);
    },
    [dropActive, enabled]
  );

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled || !hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
    },
    [enabled]
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!enabled || !hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      resetDrop();
      const transfer = event.dataTransfer;
      if (transfer) void preparePaths(Array.from(transfer.files).map(filePath).filter(Boolean));
    },
    [enabled, preparePaths, resetDrop]
  );

  const onPaste = useCallback(
    (event: ClipboardEvent) => {
      if (!enabled) return;

      const paths = clipboardFiles(event).map(filePath).filter(Boolean);
      if (paths.length > 0) {
        event.preventDefault();
        void preparePaths(paths);
        return;
      }

      if (clipboardHasSupportedImage(event)) {
        event.preventDefault();
        void prepareClipboardImage();
      }
    },
    [enabled, prepareClipboardImage, preparePaths]
  );

  return {
    dropActive,
    onDrop,
    onPaste,
    onDragOver,
    onDragEnter,
    onDragLeave
  };
};
