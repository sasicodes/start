import type { AuthStorage, ModelRegistry, SettingsManager, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { SubagentNameAllocator } from '@main/subagents/allocator';
import { runSubagents } from '@main/subagents/runtime';
import type { SubagentRunSnapshot } from '@main/subagents/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeAuthStorage, FakeModelRegistry, listFakeSessions, resetAgentRegistry } from '../fakes/agent/index.js';

const authStorage = new FakeAuthStorage() as unknown as AuthStorage;
const modelRegistry = new FakeModelRegistry() as unknown as ModelRegistry;
const settingsManager = {} as unknown as SettingsManager;
const model = new FakeModelRegistry().getAvailable()[0] as ModelRegistry['getAvailable'] extends () => Array<infer ModelItem>
  ? ModelItem
  : never;

const tool = (name: string) => ({ name }) as ToolDefinition;

describe('sub-agent runtime', () => {
  afterEach(() => {
    resetAgentRegistry();
  });

  it('keeps full sub-agent tools enabled while surfacing nested tool details', async () => {
    const snapshots: SubagentRunSnapshot[] = [];
    const run = runSubagents({
      model,
      authStorage,
      modelRegistry,
      settingsManager,
      cwd: '/workspace/project',
      tasks: [{ prompt: 'Inspect the project.' }],
      nameAllocator: new SubagentNameAllocator(),
      thinkingLevel: 'medium',
      customTools: () => [tool('browser_open'), tool('browser_snapshot')],
      onUpdate: (snapshot) => snapshots.push(snapshot)
    });

    await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(1));

    const session = listFakeSessions()[0];
    if (!session) throw new Error('Sub-agent session was not created.');
    await session.awaitPromptCall();

    expect(session.getAllTools().map(({ name }) => name)).toEqual(['fake-tool', 'browser_open', 'browser_snapshot']);
    expect(session.getActiveToolNames()).toEqual(['fake-tool', 'browser_open', 'browser_snapshot']);

    session.finishPrompt([
      {
        args: { command: 'cat .env' },
        toolCallId: 'tool-1',
        toolName: 'bash',
        type: 'tool_execution_start'
      },
      {
        result: { content: [{ text: 'SECRET_TOKEN=abc123', type: 'text' }] },
        toolCallId: 'tool-1',
        toolName: 'bash',
        type: 'tool_execution_end'
      }
    ]);

    await expect(run).resolves.toMatchObject({ agents: [{ status: 'completed' }] });

    const agent = snapshots.at(-1)?.agents[0];
    expect(agent?.toolEvents?.[0]?.title).toBe('Ran command cat .env');
    expect(agent?.toolEvents?.[0]?.body).toContain('SECRET_TOKEN=abc123');
  });
});
