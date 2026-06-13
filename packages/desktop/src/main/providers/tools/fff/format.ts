import type { WorkspaceGrepMatch, WorkspaceGrepResult, WorkspacePathMatch } from '@main/search/types';
import { boundedLine, boundedOutput } from '@main/providers/tools/fff/bounds';

export const toolResult = (text: string, details: Record<string, unknown> = {}) => ({
  details,
  content: [{ text, type: 'text' as const }]
});

const formatPathResult = (item: WorkspacePathMatch) => (item.type === 'directory' ? `${item.path}/` : item.path);

export const findText = (items: WorkspacePathMatch[]) => {
  if (items.length === 0) return 'No files found matching pattern';
  return items.map(formatPathResult).join('\n');
};

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
  if (result.matches.length === 0) return 'No matches found';

  const lines = result.matches.flatMap(contextLines);
  if (result.nextCursor > 0) {
    lines.push('');
    lines.push(`[More matches available. Continue with cursor=${result.nextCursor}.]`);
  }

  return boundedOutput(lines.join('\n'));
};

export const grepDetails = (result: WorkspaceGrepResult) => ({
  totalFiles: result.totalFiles,
  matchCount: result.matches.length,
  searchedFiles: result.searchedFiles,
  ...(result.nextCursor > 0 ? { nextCursor: result.nextCursor } : {})
});
