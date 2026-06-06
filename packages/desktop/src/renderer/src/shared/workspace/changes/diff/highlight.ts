import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

interface DiffHighlightLine {
  key: string;
  content: string;
}

interface DiffHighlightResponse {
  jobId: number;
  results: DiffHighlightResult[];
}

interface DiffHighlightResult {
  key: string;
  html: string;
}

const batchSize = 48;
const cacheLimit = 8000;
const maxLineLength = 600;
const workerIdleMs = 15_000;
const batchesPerRevision = 4;
const cacheVersion = 'syntax-v2';
const cache = new Map<string, string>();

let jobId = 0;
let idleTimer = 0;
let activeJobs = 0;
let worker: Worker | null = null;

const cacheKey = (language: string, content: string) => `${cacheVersion}\0${language}\0${content}`;

const createWorker = () => new Worker(new URL('./highlight.worker.ts', import.meta.url), { type: 'module' });

const clearIdleTimer = () => {
  if (!idleTimer) return;
  window.clearTimeout(idleTimer);
  idleTimer = 0;
};

const scheduleWorkerIdle = () => {
  if (activeJobs > 0 || !worker || idleTimer) return;
  idleTimer = window.setTimeout(() => {
    idleTimer = 0;
    if (activeJobs > 0) return;
    worker?.terminate();
    worker = null;
  }, workerIdleMs);
};

const highlightWorker = () => {
  clearIdleTimer();
  worker ??= createWorker();
  return worker;
};

const writeCache = (key: string, html: string) => {
  cache.set(key, html);
  if (cache.size <= cacheLimit) return;
  const firstKey = cache.keys().next().value;
  if (firstKey) cache.delete(firstKey);
};

export const highlightableDiffLines = (
  file: PatchFile,
  language: string,
  isCached: (key: string) => boolean = (key) => cache.has(key)
) => {
  const items: DiffHighlightLine[] = [];
  const seen = new Set<string>();

  if (!language) return items;

  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'meta' || !line.content || line.content.length > maxLineLength) continue;
      const key = cacheKey(language, line.content);
      if (seen.has(key) || isCached(key)) continue;
      seen.add(key);
      items.push({ content: line.content, key });
    }
  }

  return items;
};

export const highlightedDiffLine = (language: string, content: string, revision: number) => {
  void revision;
  if (!language || !content || content.length > maxLineLength) return '';
  return cache.get(cacheKey(language, content)) ?? '';
};

const runHighlighting = (language: string, items: DiffHighlightLine[], onRevisionBump: () => void) => {
  let index = 0;
  let active = true;
  let batchesSinceBump = 0;
  const workerJobId = jobId + 1;
  const target = highlightWorker();
  jobId = workerJobId;
  activeJobs += 1;

  const finish = () => {
    if (!active) return;
    active = false;
    activeJobs = Math.max(0, activeJobs - 1);
    target.removeEventListener('message', onMessage);
    scheduleWorkerIdle();
  };

  const onMessage = (event: MessageEvent<DiffHighlightResponse>) => {
    if (event.data.jobId !== workerJobId) return;
    if (!active) return;

    for (const result of event.data.results) writeCache(result.key, result.html);

    batchesSinceBump += 1;
    if (batchesSinceBump >= batchesPerRevision || index >= items.length) {
      batchesSinceBump = 0;
      onRevisionBump();
    }

    postNextBatch();
  };

  const postNextBatch = () => {
    if (!active) return;
    if (index >= items.length) {
      finish();
      return;
    }
    const lines = items.slice(index, index + batchSize);
    index += batchSize;
    target.postMessage({ jobId: workerJobId, language, lines });
  };

  target.addEventListener('message', onMessage);
  postNextBatch();

  return () => {
    finish();
  };
};

export const requestDiffFileHighlighting = (file: PatchFile, language: string, onRevisionBump: () => void) => {
  const items = highlightableDiffLines(file, language);
  if (items.length === 0) return;
  return runHighlighting(language, items, onRevisionBump);
};
