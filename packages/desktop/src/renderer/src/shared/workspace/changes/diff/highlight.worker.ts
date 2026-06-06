import { highlightCode } from '@renderer/shared/workspace/changes/diff/syntax';

interface DiffHighlightLine {
  key: string;
  content: string;
}

interface DiffHighlightRequest {
  jobId: number;
  language: string;
  lines: DiffHighlightLine[];
}

interface DiffHighlightResult {
  key: string;
  html: string;
}

interface DiffHighlightResponse {
  jobId: number;
  results: DiffHighlightResult[];
}

const highlightLines = async (lines: DiffHighlightLine[], language: string) => {
  const results: DiffHighlightResult[] = [];

  for (const line of lines) {
    results.push({ key: line.key, html: await highlightCode(line.content, language) });
  }

  return results;
};

self.addEventListener('message', (event: MessageEvent<DiffHighlightRequest>) => {
  const { jobId, language, lines } = event.data;

  highlightLines(lines, language)
    .then((results) => {
      self.postMessage({ jobId, results } satisfies DiffHighlightResponse);
    })
    .catch(() => {
      self.postMessage({ jobId, results: [] } satisfies DiffHighlightResponse);
    });
});
