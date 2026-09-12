import type { ModelRuntime, SettingsManager, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { SubagentNameAllocator } from '@main/subagents/allocator';
import { runSubagents } from '@main/subagents/runtime';
import type { SubagentRunSnapshot } from '@main/subagents/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FakeModelRegistry,
  FakeModelRuntime,
  FakeSessionManager,
  listFakeSessions,
  resetAgentRegistry
} from '../fakes/agent/index.js';

const modelRuntime = new FakeModelRuntime() as unknown as ModelRuntime;
const settingsManager = {} as unknown as SettingsManager;
const model = new FakeModelRegistry().getAvailable()[0];
if (!model) throw new Error('Expected a fake model.');

const tool = (name: string) => ({ name }) as ToolDefinition;

describe('sub-agent runtime', () => {
  afterEach(() => {
    resetAgentRegistry();
  });

  it('keeps full sub-agent tools enabled', async () => {
    const snapshots: SubagentRunSnapshot[] = [];
    const run = runSubagents({
      modelRuntime,
      settingsManager,
      resolveModel: () => model,
      cwd: '/workspace/project',
      tasks: [{ prompt: 'Inspect the project.', model: 'anthropic:claude-opus-4-7', effort: 'medium' }],
      nameAllocator: new SubagentNameAllocator(),
      customTools: () => [tool('browser_open'), tool('browser_snapshot')],
      onUpdate: (snapshot) => snapshots.push(snapshot)
    });

    await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(1));

    const session = listFakeSessions()[0];
    if (!session) throw new Error('Sub-agent session was not created.');
    await session.awaitPromptCall();

    const instructions = JSON.stringify(session.sessionManager.getEntries());
    expect(instructions).toContain('Inspect the project.');
    expect(instructions).toContain('validation performed, and unresolved blockers');
    expect(instructions).toContain('preserve evidence the parent needs');

    expect(session.getAllTools().map(({ name }) => name)).toEqual(['fake-tool', 'browser_open', 'browser_snapshot']);
    expect(session.getActiveToolNames()).toEqual(['fake-tool', 'browser_open', 'browser_snapshot']);

    session.finishPrompt();

    await expect(run).resolves.toMatchObject({ agents: [{ status: 'completed' }] });
    expect(snapshots.at(-1)?.agents[0]?.status).toBe('completed');
  });

  it('runs at most four sub-agents at once', async () => {
    const run = runSubagents({
      modelRuntime,
      settingsManager,
      onUpdate: () => {},
      customTools: () => [],
      resolveModel: () => model,
      cwd: '/workspace/project',
      nameAllocator: new SubagentNameAllocator(),
      tasks: Array.from({ length: 6 }, (_, index) => ({
        prompt: `Task ${index}.`,
        model: 'anthropic:claude-opus-4-7',
        effort: 'medium' as const
      }))
    });

    await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(4));
    await Promise.all(listFakeSessions().map((session) => session.awaitPromptCall()));
    await expect(FakeSessionManager.listAll()).resolves.toHaveLength(4);

    const [first] = listFakeSessions();
    if (!first) throw new Error('Expected a running sub-agent session.');
    first.finishPrompt();

    await vi.waitFor(async () => expect(await FakeSessionManager.listAll()).toHaveLength(5));
    await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(4));

    for (let remaining = 5; remaining > 0; remaining -= 1) {
      await vi.waitFor(() => expect(listFakeSessions().length).toBeGreaterThan(0));
      const session = listFakeSessions()[0];
      if (!session) throw new Error('Expected a live sub-agent session.');
      await session.awaitPromptCall();
      session.finishPrompt();
      await vi.waitFor(() => expect(listFakeSessions()).not.toContain(session));
    }

    const result = await run;
    expect(result.agents).toHaveLength(6);
    expect(result.agents.every((agent) => agent.status === 'completed')).toBe(true);
    await expect(FakeSessionManager.listAll()).resolves.toHaveLength(6);
  });
  it('reports activity, preserves partial work on failure, and cancels queued agents', async () => {
    const snapshots: SubagentRunSnapshot[] = [];
    const controller = new AbortController();
    const run = runSubagents({
      modelRuntime,
      settingsManager,
      signal: controller.signal,
      onUpdate: (snapshot) => snapshots.push(snapshot),
      customTools: () => [],
      resolveModel: () => model,
      cwd: '/workspace/project',
      nameAllocator: new SubagentNameAllocator(),
      tasks: Array.from({ length: 5 }, (_, index) => ({
        prompt: `Task ${index}`,
        model: 'test',
        effort: 'medium' as const
      }))
    });
    await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(4));
    const session = listFakeSessions()[0];
    if (!session) throw new Error('Expected session');
    await session.awaitPromptCall();
    session.pushEvent({ type: 'tool_execution_start', toolName: 'bash', toolCallId: '1', args: {} });
    expect(snapshots.at(-1)?.agents[0]).toMatchObject({ status: 'running', activity: 'Running bash' });
    vi.spyOn(session, 'getLastAssistantText').mockReturnValue('Reviewed two files.');
    session.failPrompt('Provider connection lost');
    await vi.waitFor(() => expect(snapshots.some((snapshot) => snapshot.agents[0]?.status === 'failed')).toBe(true));
    controller.abort();
    const result = await run;
    expect(result.agents[0]?.summary).toContain('Provider connection lost');
    expect(result.agents[0]?.summary).toContain('Reviewed two files.');
    expect(result.agents.slice(1).every((agent) => agent.status === 'cancelled')).toBe(true);
    expect(result.text).toContain('Status: failed');
    expect(result.text).toContain('Status: cancelled');
    expect(listFakeSessions()).toHaveLength(0);
  });
});
