import type { SearchHostRequest, SearchHostResponse } from '@main/search/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeHostProcess {
  killed: boolean;
  posted: SearchHostRequest[];
  emitExit: () => void;
  emitMessage: (message: SearchHostResponse) => void;
  kill: () => void;
  on: (event: string, handler: (payload: never) => void) => void;
  once: (event: string, handler: (payload: never) => void) => void;
  postMessage: (message: SearchHostRequest) => void;
  removeAllListeners: () => void;
}

const electronMock = vi.hoisted(() => ({
  forkError: false,
  children: [] as FakeHostProcess[]
}));

vi.mock('electron', () => {
  const fork = () => {
    if (electronMock.forkError) throw new Error('spawn failed');

    const listeners = new Map<string, Set<(payload: unknown) => void>>();
    const handlersFor = (event: string) => {
      const handlers = listeners.get(event) ?? new Set<(payload: unknown) => void>();
      listeners.set(event, handlers);
      return handlers;
    };

    const child: FakeHostProcess = {
      killed: false,
      posted: [],
      emitExit: () => {
        for (const handler of [...handlersFor('exit')]) handler(0);
      },
      emitMessage: (message) => {
        for (const handler of [...handlersFor('message')]) handler(message);
      },
      kill: () => {
        child.killed = true;
      },
      on: (event, handler) => {
        handlersFor(event).add(handler as (payload: unknown) => void);
      },
      once: (event, handler) => {
        const wrapped = (payload: unknown) => {
          handlersFor(event).delete(wrapped);
          (handler as (payload: unknown) => void)(payload);
        };
        handlersFor(event).add(wrapped);
      },
      postMessage: (message) => {
        child.posted.push(message);
      },
      removeAllListeners: () => {
        listeners.clear();
      }
    };
    electronMock.children.push(child);
    return child;
  };

  return { default: { utilityProcess: { fork } } };
});

const freshClient = async () => {
  vi.resetModules();
  electronMock.forkError = false;
  electronMock.children.length = 0;
  return await import('@main/search/client');
};

describe('search host client', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves host responses for matching request ids', async () => {
    const client = await freshClient();

    const pending = client.findWorkspacePaths({ cwd: '/repo', limit: 5, pattern: 'chat' });
    const child = electronMock.children[0];
    const request = child?.posted[0];
    if (!child || !request) throw new Error('Expected a host request.');

    expect(request.op).toBe('find');
    expect(request.args).toEqual({ cwd: '/repo', limit: 5, pattern: 'chat' });

    child.emitMessage({ id: request.id, value: [{ path: 'src/main/chat.ts', type: 'file' }] });
    await expect(pending).resolves.toEqual([{ path: 'src/main/chat.ts', type: 'file' }]);
  });

  it('resolves null when the host misses the request deadline', async () => {
    vi.useFakeTimers();
    const client = await freshClient();

    const pending = client.searchWorkspacePaths({ query: 'chat', limit: 5, workspaceRoot: '/repo' });
    vi.advanceTimersByTime(3000);

    await expect(pending).resolves.toBeNull();
  });

  it('settles in-flight requests on host exit and respawns for the next request', async () => {
    const client = await freshClient();

    const pending = client.grepWorkspace({ cwd: '/repo', limit: 5, pattern: 'chat' });
    electronMock.children[0]?.emitExit();
    await expect(pending).resolves.toBeNull();

    const next = client.grepWorkspace({ cwd: '/repo', limit: 5, pattern: 'chat' });
    expect(electronMock.children).toHaveLength(2);

    const child = electronMock.children[1];
    const request = child?.posted[0];
    if (!child || !request) throw new Error('Expected a respawned host request.');
    child.emitMessage({ id: request.id, value: null });
    await expect(next).resolves.toBeNull();
  });

  it('backs off after repeated rapid host crashes', async () => {
    const client = await freshClient();

    for (let crash = 0; crash < 3; crash += 1) {
      const pending = client.grepWorkspace({ cwd: '/repo', limit: 5, pattern: 'chat' });
      electronMock.children[crash]?.emitExit();
      await expect(pending).resolves.toBeNull();
    }

    await expect(client.grepWorkspace({ cwd: '/repo', limit: 5, pattern: 'chat' })).resolves.toBeNull();
    expect(electronMock.children).toHaveLength(3);
  });

  it('resolves null when the host cannot be spawned', async () => {
    const client = await freshClient();
    electronMock.forkError = true;

    await expect(client.findWorkspacePaths({ cwd: '/repo', limit: 5, pattern: 'chat' })).resolves.toBeNull();
    expect(electronMock.children).toHaveLength(0);
  });

  it('posts warm requests without awaiting and kills the host on dispose', async () => {
    const client = await freshClient();

    client.warmWorkspaceFinder('/repo');
    const child = electronMock.children[0];
    if (!child) throw new Error('Expected a host process.');

    expect(child.posted[0]?.op).toBe('warm');

    client.disposeWorkspaceFinders();
    expect(child.killed).toBe(true);
  });
});
