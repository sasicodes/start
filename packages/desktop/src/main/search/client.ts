import path from 'node:path';
import { agentWaitMs, grepTimeBudgetMs, uiWaitMs } from '@main/search/limits';
import type {
  FindOptions,
  GrepOptionsInput,
  MultiGrepOptionsInput,
  PathSearchOptions,
  SearchHostRequest,
  SearchHostResponse,
  WorkspaceGrepResult,
  WorkspacePathMatch
} from '@main/search/types';
import electron from 'electron';

const maxRapidCrashes = 3;
const refreshWaitMs = 5000;
const requestSlackMs = 2000;
const respawnBackoffMs = 30_000;

interface PendingRequest {
  timer: NodeJS.Timeout;
  resolve: (value: unknown) => void;
}

let requestId = 0;
let crashCount = 0;
let lastCrashAt = 0;
let host: Electron.UtilityProcess | null = null;

const pending = new Map<number, PendingRequest>();

const settle = (id: number, value: unknown) => {
  const request = pending.get(id);
  if (!request) return;

  pending.delete(id);
  clearTimeout(request.timer);
  request.resolve(value);
};

const settleAll = () => {
  for (const id of [...pending.keys()]) settle(id, null);
};

const recordHostExit = () => {
  const exitedAt = Date.now();
  crashCount = exitedAt - lastCrashAt < respawnBackoffMs ? crashCount + 1 : 1;
  lastCrashAt = exitedAt;
  settleAll();
};

const hostBackedOff = () => crashCount >= maxRapidCrashes && Date.now() - lastCrashAt < respawnBackoffMs;

const spawnHost = () => {
  try {
    const child = electron.utilityProcess.fork(path.join(__dirname, 'search-host.cjs'), [], {
      serviceName: 'start-search-host'
    });
    child.on('message', (message: SearchHostResponse) => settle(message.id, message.value));
    child.once('exit', () => {
      if (host === child) host = null;
      recordHostExit();
    });
    return child;
  } catch {
    return null;
  }
};

const searchHost = () => {
  if (host) return host;
  if (hostBackedOff()) return null;

  host = spawnHost();
  return host;
};

const hostRequest = (op: SearchHostRequest['op'], args: SearchHostRequest['args'], timeoutMs: number) =>
  new Promise<unknown>((resolve) => {
    const child = searchHost();
    if (!child) {
      resolve(null);
      return;
    }

    requestId += 1;
    const id = requestId;
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve(null);
    }, timeoutMs);
    pending.set(id, { timer, resolve });

    try {
      child.postMessage({ id, op, args });
    } catch {
      settle(id, null);
    }
  });

const agentDeadlineMs = (waitMs?: number) => (waitMs ?? agentWaitMs) + grepTimeBudgetMs + requestSlackMs;

export const searchWorkspacePaths = async (options: PathSearchOptions) =>
  (await hostRequest('search', options, (options.waitMs ?? uiWaitMs) + requestSlackMs)) as WorkspacePathMatch[] | null;

export const findWorkspacePaths = async (options: FindOptions) =>
  (await hostRequest('find', options, agentDeadlineMs(options.waitMs))) as WorkspacePathMatch[] | null;

export const grepWorkspace = async (options: GrepOptionsInput) =>
  (await hostRequest('grep', options, agentDeadlineMs(options.waitMs))) as WorkspaceGrepResult | null;

export const multiGrepWorkspace = async (options: MultiGrepOptionsInput) =>
  (await hostRequest('multiGrep', options, agentDeadlineMs(options.waitMs))) as WorkspaceGrepResult | null;

export const refreshWorkspaceFinder = async (workspaceRoot: string) =>
  Boolean(await hostRequest('refresh', { workspaceRoot }, refreshWaitMs));

export const warmWorkspaceFinder = (workspaceRoot: string) => {
  hostRequest('warm', { workspaceRoot }, requestSlackMs).catch(() => {});
};

export const disposeWorkspaceFinders = () => {
  const child = host;
  host = null;
  settleAll();
  if (!child) return;

  child.removeAllListeners();
  child.kill();
};
