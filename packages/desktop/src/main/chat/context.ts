import type { Usage } from '@earendil-works/pi-ai';

const usedTokens = (usage: Usage) => usage.totalTokens || usage.input + usage.cacheRead + usage.cacheWrite;

export const contextPercent = (usage: Usage | undefined, contextWindow: number): number => {
  if (!usage || contextWindow <= 0) return 0;
  return Math.min(100, Math.max(0, (usedTokens(usage) / contextWindow) * 100));
};
