import { effect } from '@preact/signals';
import { createGoalEditor, goalEditor } from '@renderer/shared/goal/edit';
import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface GoalEditorOptions {
  draft: string;
  overlay: boolean;
  hasAttachments: boolean;
  onDraftChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export const useGoalEditor = ({ draft, overlay, hasAttachments, onDraftChange, textareaRef }: GoalEditorOptions) => {
  const context = useRef({ draft, hasAttachments, onDraftChange, focus: () => textareaRef.current?.focus() });
  context.current = { draft, hasAttachments, onDraftChange, focus: () => textareaRef.current?.focus() };
  const editorRef = useRef<ReturnType<typeof createGoalEditor> | null>(null);
  editorRef.current ??= createGoalEditor(() => context.current);
  const editor = editorRef.current;

  useEffect(() => {
    if (overlay) return;
    goalEditor.value = editor;
    const unsubscribe = effect(editor.sync);
    return () => {
      unsubscribe();
      editor.dispose();
      if (goalEditor.peek() === editor) goalEditor.value = null;
    };
  }, [editor, overlay]);

  return editor;
};
