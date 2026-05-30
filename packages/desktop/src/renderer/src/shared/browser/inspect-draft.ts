export const appendInspectToDraft = (draft: string, block: string): string => {
  const trimmedBlock = block.trim();
  if (!trimmedBlock) return draft;
  const trimmedDraft = draft.replace(/\s+$/u, '');
  if (!trimmedDraft) return trimmedBlock;
  return `${trimmedDraft}\n\n${trimmedBlock}`;
};
