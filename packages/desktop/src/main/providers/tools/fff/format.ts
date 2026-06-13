import type { AgentToolResult } from '@earendil-works/pi-coding-agent';
import { boundedLine, boundedOutput } from '@main/providers/tools/fff/bounds';
import { hasGlobChars } from '@main/search/path';
import type { WorkspaceGrepMatch, WorkspaceGrepResult, WorkspacePathMatch } from '@main/search/types';

export const cursorRestartNote = '[Note: the FFF cursor is no longer available; results restart from the beginning.]';

const formatPathResult = (item: WorkspacePathMatch) => (item.type === 'directory' ? `${item.path}/` : item.path);

export const findText = (items: WorkspacePathMatch[]) => {
  if (items.length === 0) return 'No files found matching pattern';
  return items.map(formatPathResult).join('\n');
};

export const fallbackFindPattern = (pattern: string) => {
  const clean = pattern.trim();
  if (!clean || hasGlobChars(clean)) return pattern;
  return `*${clean.split(/\s+/u).join('*')}*`;
};

export const restartedPagination = <T>(result: AgentToolResult<T>): AgentToolResult<T> => ({
  ...result,
  content: [{ text: cursorRestartNote, type: 'text' as const }, ...result.content]
});

const contextLines = (match: WorkspaceGrepMatch) => {
  const lines: string[] = [];
  const beforeStart = match.line - match.contextBefore.length;

  for (const [index, text] of match.contextBefore.entries()) {
    lines.push(`${match.path}-${beforeStart + index}- ${boundedLine(text)}`);
  }

  lines.push(`${match.path}:${match.line}: ${boundedLine(match.text)}`);

  for (const [index, text] of match.contextAfter.entries()) {
    lines.push(`${match.path}-${match.line + index + 1}- ${boundedLine(text)}`);
  }

  return lines;
};

export const grepText = (result: WorkspaceGrepResult) => {
  const matchesText =
    result.matches.length > 0 ? boundedOutput(result.matches.flatMap(contextLines).join('\n')) : 'No matches found';
  const output = result.restarted ? `${cursorRestartNote}\n${matchesText}` : matchesText;
  if (result.nextCursor <= 0) return output;
  return `${output}\n\n[More matches available. Continue with cursor=${result.nextCursor}.]`;
};

export const grepDetails = (result: WorkspaceGrepResult) => ({
  totalFiles: result.totalFiles,
  matchCount: result.matches.length,
  searchedFiles: result.searchedFiles,
  ...(result.restarted ? { restarted: true } : {}),
  ...(result.nextCursor > 0 ? { nextCursor: result.nextCursor } : {})
});
