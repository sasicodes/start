import type { GitChangeSummary } from '@preload/index';

export const hasGitDiff = (summary: GitChangeSummary) => summary.filesChanged > 0;
