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
  isDefinition: boolean;
  contextAfter: string[];
  contextBefore: string[];
}

export interface WorkspaceGrepResult {
  nextCursor: number;
  totalFiles: number;
  restarted?: boolean;
  searchedFiles: number;
  matches: WorkspaceGrepMatch[];
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
  path?: string;
  limit: number;
  mode?: GrepMode;
  cursor?: number;
  pattern: string;
  context?: number;
  ignoreCase?: boolean;
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

export interface WorkspaceRootArgs {
  workspaceRoot: string;
}

export interface SearchHostResponse {
  id: number;
  value: unknown;
}

export type SearchHostRequest =
  | { id: number; op: 'find'; args: FindOptions }
  | { id: number; op: 'grep'; args: GrepOptionsInput }
  | { id: number; op: 'warm'; args: WorkspaceRootArgs }
  | { id: number; op: 'search'; args: PathSearchOptions }
  | { id: number; op: 'refresh'; args: WorkspaceRootArgs }
  | { id: number; op: 'multiGrep'; args: MultiGrepOptionsInput };
