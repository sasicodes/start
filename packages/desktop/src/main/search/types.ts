import type { GrepMode } from '@ff-labs/fff-node';

export interface SearchWaitOptions {
  waitMs?: number;
}

export interface WorkspacePathMatch {
  path: string;
  type: 'directory' | 'file';
}

export interface WorkspaceGrepMatch {
  line: number;
  path: string;
  text: string;
  contextAfter: string[];
  contextBefore: string[];
  isDefinition: boolean;
}

export interface WorkspaceGrepResult {
  matches: WorkspaceGrepMatch[];
  nextCursor: number;
  totalFiles: number;
  searchedFiles: number;
}

export interface PathSearchOptions extends SearchWaitOptions {
  query: string;
  limit: number;
  folderPath?: string;
  workspaceRoot: string;
}

export interface FindOptions extends SearchWaitOptions {
  cwd: string;
  limit: number;
  path?: string;
  pattern: string;
}

export interface GrepOptionsInput extends SearchWaitOptions {
  cwd: string;
  glob?: string;
  limit: number;
  mode?: GrepMode;
  path?: string;
  cursor?: number;
  context?: number;
  pattern: string;
  classifyDefinitions?: boolean;
}

export interface MultiGrepOptionsInput extends SearchWaitOptions {
  cwd: string;
  limit: number;
  cursor?: number;
  context?: number;
  patterns: string[];
  constraints?: string;
  classifyDefinitions?: boolean;
}
