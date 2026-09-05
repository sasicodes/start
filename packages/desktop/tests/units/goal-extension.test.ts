import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import type { GoalController } from '@main/goal/controller';
import { createGoalExtension } from '@main/goal/extension';
import { describe, expect, it, vi } from 'vitest';

interface TestTool {
  name: string;
  execute: (id: string, parameters: unknown) => Promise<unknown>;
}

type PromptHook = (event: { systemPrompt: string }) => Promise<unknown>;

const fixture = async (active: boolean) => {
  const controller: GoalController = {
    get: () => (active ? { objective: 'test', status: 'active', iterations: 1, elapsedMs: 0 } : null),
    start: vi.fn(),
    update: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    finish: vi.fn(),
    beginIteration: () => active,
    continuation: () => (active ? 'Continue test goal' : '')
  };
  const tools: TestTool[] = [];
  const hooks: PromptHook[] = [];
  const api = {
    on: (_event: string, hook: PromptHook) => hooks.push(hook),
    registerTool: (tool: TestTool) => tools.push(tool)
  } as unknown as ExtensionAPI;
  await createGoalExtension(controller)(api);
  const hook = hooks[0];
  const get = tools.find((tool) => tool.name === 'get_goal');
  const finish = tools.find((tool) => tool.name === 'finish_goal');
  if (!hook || !get || !finish) throw new Error('Expected goal extension registration');
  return { hook, get, finish, tools, controller };
};

describe('goal extension', () => {
  it('exposes only read/finish tools and preserves the existing system prompt', async () => {
    const { hook, tools, get } = await fixture(true);
    expect(tools.map((tool) => tool.name)).toEqual(['get_goal', 'finish_goal']);
    const result = await hook({ systemPrompt: 'Existing rules' });
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('Existing rules'));
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('Objective: test'));
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('does not override'));
    expect(await get.execute('id', {})).toMatchObject({ details: { objective: 'test', status: 'active' } });
  });

  it('leaves ordinary turns unchanged and reports no goal', async () => {
    const { hook, get } = await fixture(false);
    expect(await hook({ systemPrompt: 'Existing rules' })).toBeFalsy();
    expect(await get.execute('id', {})).toMatchObject({ details: null, content: [{ text: 'There is no goal.' }] });
  });

  it('reinjects the current objective after compaction and composes with existing workflows', async () => {
    const { hook, controller } = await fixture(true);
    controller.get = () => ({ objective: 'Verify the release', status: 'active', iterations: 2, elapsedMs: 0 });
    const result = await hook({ systemPrompt: 'Compacted context' });
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('Objective: Verify the release'));
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('verifying the entire objective'));
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('run_workflow'));
    expect(result).toHaveProperty(
      'systemPrompt',
      expect.stringContaining('call finish_goal before giving the final user-facing answer')
    );
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('Give that answer once'));
    expect(result).toHaveProperty('systemPrompt', expect.stringContaining('simple goals do not require a workflow'));
    controller.get = () => ({ objective: 'Verify the release', status: 'paused', iterations: 2, elapsedMs: 0 });
    expect(await hook({ systemPrompt: 'Compacted context' })).toBeFalsy();
  });

  it('validates finish input before updating goal state', async () => {
    const { finish, controller } = await fixture(true);
    await expect(finish.execute('id', { status: 'cancelled', reason: 'invalid' })).rejects.toThrow();
    await expect(finish.execute('id', { status: 'completed', reason: ' ' })).rejects.toThrow();
    await expect(finish.execute('id', { status: 'blocked', reason: 'x'.repeat(2001) })).rejects.toThrow();
    expect(controller.finish).not.toHaveBeenCalled();
    await finish.execute('id', { status: 'completed', reason: ' Tests passed ' });
    expect(controller.finish).toHaveBeenCalledExactlyOnceWith('completed', 'Tests passed');
  });
});
