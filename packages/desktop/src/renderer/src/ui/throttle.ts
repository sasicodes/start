export const createThrottle = (intervalMs: number) => {
  const lastRun = new Map<string, number>();
  return (name: string, now = Date.now()) => {
    if (now - (lastRun.get(name) ?? 0) < intervalMs) return true;
    lastRun.set(name, now);
    return false;
  };
};
