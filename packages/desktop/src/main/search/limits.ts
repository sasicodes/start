export const uiWaitMs = 250;
export const agentWaitMs = 10_000;
export const maxGrepContext = 3;
export const maxFindPageSize = 500;
export const maxGrepPageSize = 100;
export const grepTimeBudgetMs = 2000;
export const maxMatchesPerFile = 20;
export const maxGrepFileSize = 2 * 1024 * 1024;

export const boundedCount = (value: number, max: number) => {
  if (!Number.isFinite(value)) return max;
  return Math.min(Math.max(1, Math.floor(value)), max);
};

export const boundedContext = (value = 0) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), maxGrepContext);
};
