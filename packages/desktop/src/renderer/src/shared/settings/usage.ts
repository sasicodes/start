import type { ProviderUsage } from '@preload/index';

const resetDelay = (resetAt: number, now: number) => {
  const remainingMs = resetAt - now;
  if (remainingMs <= 0) return 'soon';

  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;

  const hours = Math.ceil(remainingMs / 3_600_000);
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.ceil(remainingMs / 86_400_000)}d`;
};

export const usageLabel = (usage: ProviderUsage, now = Date.now()) => {
  const reset = usage.resetAt ? ` / resets ${resetDelay(usage.resetAt, now)}` : '';
  return `${usage.remainingPercent}% remaining${reset}`;
};
