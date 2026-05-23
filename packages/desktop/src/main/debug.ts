import { environment } from '@main/environment';
import { rendererProcessLabels } from '@main/window';
import { app, type ProcessMetric } from 'electron';

export const debugToolbarEnabled = () => !app.isPackaged && Boolean(environment.rendererUrl);

const kilobytesToMegabytes = (value: number) => Math.round((value / 1024) * 10) / 10;

const cpuPercent = (metric: ProcessMetric) => Math.round(metric.cpu.percentCPUUsage * 10) / 10;

const processName = (metric: ProcessMetric, rendererLabels: Map<number, string>) => {
  const rendererLabel = rendererLabels.get(metric.pid);
  if (rendererLabel) return rendererLabel;
  if (metric.type === 'Browser') return 'main';
  if (metric.type === 'GPU') return 'gpu';
  if (metric.type === 'Tab') return 'renderer';
  return (metric.name || metric.serviceName || metric.type).toLowerCase();
};

const processEntry = (metric: ProcessMetric, rendererLabels: Map<number, string>) => ({
  pid: metric.pid,
  type: metric.type,
  name: processName(metric, rendererLabels),
  cpuPercent: cpuPercent(metric),
  memoryMb: kilobytesToMegabytes(metric.memory.workingSetSize)
});

export const getDebugMetrics = () => {
  const appMetrics = app.getAppMetrics();
  const rendererLabels = rendererProcessLabels();
  const appMemoryKb = appMetrics.reduce((total, metric) => total + metric.memory.workingSetSize, 0);
  const cpuTotal = appMetrics.reduce((total, metric) => total + metric.cpu.percentCPUUsage, 0);
  const entries = appMetrics.map((metric) => processEntry(metric, rendererLabels));
  const mainEntry = entries.find((entry) => entry.type === 'Browser');
  const childEntries = entries
    .filter((entry) => entry !== mainEntry)
    .sort((first, second) => second.memoryMb - first.memoryMb);
  const processes = mainEntry ? [{ ...mainEntry, children: childEntries }] : childEntries;

  return {
    processes,
    processCount: appMetrics.length,
    appMemoryMb: kilobytesToMegabytes(appMemoryKb),
    cpuPercent: Math.round(cpuTotal * 10) / 10
  };
};
