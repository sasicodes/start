import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

export type DiffFileStatus = PatchFile['status'] | 'untracked';
export type DiffViewMode = 'split' | 'unified';

export interface DiffEntry {
  file: PatchFile;
  key: string;
  language: string;
  status: DiffFileStatus;
}

export type DiffEntriesState = { kind: 'parsing' } | { entries: DiffEntry[]; kind: 'ready' };
