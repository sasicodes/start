import type { DiffEntry } from '@renderer/shared/workspace/changes/diff/types';

type CodeHighlightModule = typeof import('@renderer/shared/workspace/changes/diff/syntax');

interface DiffHighlightItem {
  content: string;
  key: string;
  language: string;
}

export const diffHighlightBatchSize = 200;
export const diffHighlightRevisionBatchCount = 4;

const diffHighlightCacheLimit = 8000;
const maxDiffHighlightLineLength = 600;
const diffHighlightCache = new Map<string, string>();
const diffHighlightCacheVersion = 'syntax-v2';
let codeHighlightModulePromise: Promise<CodeHighlightModule> | undefined;

const diffHighlightKey = (language: string, content: string) => `${diffHighlightCacheVersion}\0${language}\0${content}`;

export const loadCodeHighlighter = () => {
  codeHighlightModulePromise ??= import('@renderer/shared/workspace/changes/diff/syntax');
  return codeHighlightModulePromise;
};

export const cacheDiffHighlight = (key: string, html: string) => {
  diffHighlightCache.set(key, html);
  if (diffHighlightCache.size <= diffHighlightCacheLimit) return;

  const firstKey = diffHighlightCache.keys().next().value;
  if (firstKey) diffHighlightCache.delete(firstKey);
};

export const highlightedDiffLine = (language: string, content: string, revision: number) => {
  void revision;
  if (!language || !content || content.length > maxDiffHighlightLineLength) return '';
  return diffHighlightCache.get(diffHighlightKey(language, content)) ?? '';
};

export const collectDiffHighlightItems = (entries: DiffEntry[]) => {
  const items: DiffHighlightItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.language) continue;

    for (const hunk of entry.file.hunks) {
      for (const line of hunk.lines) {
        if (line.kind === 'meta' || !line.content || line.content.length > maxDiffHighlightLineLength) continue;

        const key = diffHighlightKey(entry.language, line.content);
        if (seen.has(key) || diffHighlightCache.has(key)) continue;

        seen.add(key);
        items.push({ content: line.content, key, language: entry.language });
      }
    }
  }

  return items;
};

export const hasDiffHighlight = (key: string) => diffHighlightCache.has(key);
