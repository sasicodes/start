import type { DiffEntry } from '@renderer/shared/workspace/changes/diff/types';

type CodeHighlightModule = typeof import('@renderer/shared/workspace/changes/diff/syntax');

interface DiffHighlightItem {
  key: string;
  content: string;
  language: string;
}

const batchSize = 200;
const cacheLimit = 8000;
const maxLineLength = 600;
const batchesPerRevision = 4;
const cacheVersion = 'syntax-v2';
const cache = new Map<string, string>();

let modulePromise: Promise<CodeHighlightModule> | undefined;

const cacheKey = (language: string, content: string) => `${cacheVersion}\0${language}\0${content}`;

const loadHighlighter = () => {
  modulePromise ??= import('@renderer/shared/workspace/changes/diff/syntax');
  return modulePromise;
};

const writeCache = (key: string, html: string) => {
  cache.set(key, html);
  if (cache.size <= cacheLimit) return;
  const firstKey = cache.keys().next().value;
  if (firstKey) cache.delete(firstKey);
};

const collectItems = (entries: DiffEntry[]) => {
  const items: DiffHighlightItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.language) continue;
    for (const hunk of entry.file.hunks) {
      for (const line of hunk.lines) {
        if (line.kind === 'meta' || !line.content || line.content.length > maxLineLength) continue;
        const key = cacheKey(entry.language, line.content);
        if (seen.has(key) || cache.has(key)) continue;
        seen.add(key);
        items.push({ content: line.content, key, language: entry.language });
      }
    }
  }
  return items;
};

const highlightBatch = async (
  items: DiffHighlightItem[],
  start: number,
  end: number,
  highlightCode: CodeHighlightModule['highlightCode']
) => {
  const pending: Promise<void>[] = [];
  for (let index = start; index < end; index += 1) {
    const item = items[index];
    if (!item || cache.has(item.key)) continue;
    pending.push(highlightCode(item.content, item.language).then((html) => writeCache(item.key, html)));
  }
  await Promise.all(pending);
};

export const highlightedDiffLine = (language: string, content: string, revision: number) => {
  void revision;
  if (!language || !content || content.length > maxLineLength) return '';
  return cache.get(cacheKey(language, content)) ?? '';
};

export const runDiffHighlighting = (entries: DiffEntry[], onRevisionBump: () => void) => {
  let active = true;
  let frame = 0;

  void loadHighlighter()
    .then(async ({ highlightCode }) => {
      if (!active) return;
      const items = collectItems(entries);
      if (items.length === 0) return;

      let index = 0;
      let batchesSinceBump = 0;

      const tick = async () => {
        const end = Math.min(index + batchSize, items.length);
        await highlightBatch(items, index, end, highlightCode);
        if (!active) return;

        index = end;
        batchesSinceBump += 1;

        if (batchesSinceBump >= batchesPerRevision || index >= items.length) {
          batchesSinceBump = 0;
          onRevisionBump();
        }
        if (index < items.length) frame = window.requestAnimationFrame(() => void tick());
      };

      frame = window.requestAnimationFrame(() => void tick());
    })
    .catch(() => {});

  return () => {
    active = false;
    window.cancelAnimationFrame(frame);
  };
};
