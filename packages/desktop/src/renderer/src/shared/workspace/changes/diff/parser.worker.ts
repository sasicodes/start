import { parseGitPatch, type PatchFile } from './parser';

interface ParseRequest {
  jobId: number;
  patches: string[];
}

interface ParseResponse {
  jobId: number;
  results: PatchFile[][];
}

self.addEventListener('message', (event: MessageEvent<ParseRequest>) => {
  const { jobId, patches } = event.data;
  const results = patches.map((patch) => parseGitPatch(patch));
  self.postMessage({ jobId, results } satisfies ParseResponse);
});
