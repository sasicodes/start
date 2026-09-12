import type { ModelRuntime, SettingsManager } from '@earendil-works/pi-coding-agent';
import { createSubagentTools } from '@main/providers/tools/subagents';
import { SubagentNameAllocator } from '@main/subagents/allocator';
import type { Workflow } from '@main/subagents/workflow';
import type { SubagentActivity } from '@main/types';
import { afterEach, expect, it, vi } from 'vitest';
import { FakeModelRegistry, FakeModelRuntime, listFakeSessions, resetAgentRegistry } from '../fakes/agent/index.js';

interface Result {
  content: { text: string }[];
  details: { workflowId: string; running: boolean; agents: SubagentActivity[] };
}
interface Tool {
  name: string;
  prepareArguments: (args: unknown) => unknown;
  execute: (id: string, args: unknown) => Promise<Result>;
}

afterEach(() => {
  resetAgentRegistry();
  vi.useRealTimers();
});

it('lets the parent retrieve a failure and cancel remaining work across tool refreshes', async () => {
  const model = new FakeModelRegistry().getAvailable()[0];
  if (!model) throw new Error('Missing test model');
  const lifetime = new AbortController();
  const workflows = new Map<string, Workflow>();
  const options = {
    workflows,
    cwd: () => '/workspace/project',
    customTools: () => [],
    availableModels: () => [],
    resolveModel: () => model,
    lifetimeSignal: () => lifetime.signal,
    nameAllocator: () => new SubagentNameAllocator(),
    modelRuntime: new FakeModelRuntime() as unknown as ModelRuntime,
    settingsManager: {} as SettingsManager
  };
  const invoke = async (name: string, args: unknown) => {
    const tool = createSubagentTools(options).find((entry) => entry.name === name) as unknown as Tool;
    return tool.execute('call', tool.prepareArguments(args));
  };
  const run = invoke('run_workflow', {
    tasks: [
      { prompt: 'Inspect first file', model: 'test', effort: 'low' },
      { prompt: 'Inspect second file', model: 'test', effort: 'low' }
    ]
  });
  await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(2));
  const session = listFakeSessions()[0];
  if (!session) throw new Error('Missing session');
  await session.awaitPromptCall();
  session.failPrompt('Provider disconnected');
  const partial = await run;
  expect(partial.details.running).toBe(true);
  expect(partial.content[0]?.text).toContain(partial.details.workflowId);
  expect(partial.content[0]?.text).toContain('Provider disconnected');
  const check = await invoke('wait_workflow', { workflowId: partial.details.workflowId, waitMs: 0 });
  expect(check.details.agents.map((agent) => agent.status)).toEqual(['failed', 'running']);
  const cancel = await invoke('cancel_workflow', { workflowId: partial.details.workflowId });
  expect(cancel.details.agents.map((agent) => agent.status)).toEqual(['failed', 'cancelled']);
  expect(cancel.details.running).toBe(false);
  expect(listFakeSessions()).toHaveLength(0);
  await expect(invoke('wait_workflow', { workflowId: partial.details.workflowId, waitMs: -1 })).rejects.toThrow();
  await expect(invoke('wait_workflow', { workflowId: 'missing', waitMs: 0 })).rejects.toThrow('Workflow not found');
});
