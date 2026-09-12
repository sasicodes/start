import type { SubagentRunResult, SubagentRunSnapshot } from '@main/subagents/types';
import { Workflow } from '@main/subagents/workflow';
import type { SubagentActivity } from '@main/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

const agent = (id: string, status: SubagentActivity['status'] = 'running'): SubagentActivity => ({
  id,
  status,
  name: id,
  task: 'Review code',
  avatar: '',
  accentColor: '',
  activity: 'Running bash',
  lastActivityAt: Date.now()
});

const setup = () => {
  const lifetime = new AbortController();
  let update: (snapshot: SubagentRunSnapshot) => void = () => {};
  let finish: (result: SubagentRunResult) => void = () => {};
  const workflow = new Workflow((_signal, onUpdate) => {
    update = onUpdate;
    update({ agents: [agent('one'), agent('two')] });
    return new Promise((resolve) => {
      finish = resolve;
    });
  }, lifetime.signal);
  return { workflow, lifetime, update, finish };
};

afterEach(() => vi.useRealTimers());

describe('workflow checkpoints', () => {
  it('returns a checkpoint without cancelling a silent agent, even after twenty minutes', async () => {
    vi.useFakeTimers();
    const { workflow, finish } = setup();
    const wait = workflow.wait(30000);
    await vi.advanceTimersByTimeAsync(30000);
    const checkpoint = await wait;
    expect(checkpoint).toMatchObject({ running: true, workflowId: workflow.id });
    expect(checkpoint.text).toContain(workflow.id);
    await vi.advanceTimersByTimeAsync(20 * 60000);
    expect(workflow.controller.signal.aborted).toBe(false);
    expect(workflow.result().text).toContain('Seconds since activity: 1230');
    finish({ agents: [agent('one', 'completed'), agent('two', 'completed')], text: 'done' });
    await Promise.resolve();
    expect(workflow.result().running).toBe(false);
  });

  it('returns a failure promptly while preserving other running agents', async () => {
    vi.useFakeTimers();
    const { workflow, update, finish } = setup();
    const wait = workflow.wait(30000);
    const agents = [
      { ...agent('one', 'failed'), summary: 'Connection lost. Partial response: checked files.' },
      agent('two')
    ];
    update({ agents });
    const result = await wait;
    expect(result.running).toBe(true);
    expect(result.text).toContain('Status: failed');
    expect(result.text).toContain('Connection lost. Partial response: checked files.');
    expect(workflow.controller.signal.aborted).toBe(false);
    finish({ agents: agents.map((value) => (value.id === 'two' ? agent('two', 'completed') : value)), text: 'done' });
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not return early for token updates', async () => {
    vi.useFakeTimers();
    const { workflow, update, finish } = setup();
    const received = vi.fn();
    const wait = workflow.wait(30000).then(received);
    update({ agents: [{ ...agent('one'), activity: 'Thinking' }, agent('two')] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(received).not.toHaveBeenCalled();
    finish({ agents: [agent('one', 'completed'), agent('two', 'completed')], text: 'done' });
    await wait;
    expect(received).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels work with its parent lifetime and allows immediate checks', async () => {
    const { workflow, lifetime, finish } = setup();
    expect((await workflow.wait(0)).running).toBe(true);
    lifetime.abort();
    expect(workflow.controller.signal.aborted).toBe(true);
    finish({ agents: [agent('one', 'cancelled'), agent('two', 'cancelled')], text: 'cancelled' });
    await Promise.resolve();
    expect(workflow.result().text).toContain('Status: cancelled');
  });

  it('stops waiting without cancelling work when just the wait is interrupted', async () => {
    vi.useFakeTimers();
    const { workflow, finish } = setup();
    const controller = new AbortController();
    const wait = workflow.wait(30000, controller.signal);
    controller.abort();
    expect((await wait).running).toBe(true);
    expect(workflow.controller.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    finish({ agents: [], text: '' });
  });

  it('reports setup errors even if no agents were created', async () => {
    const workflow = new Workflow(async () => {
      throw new Error('Setup failed');
    }, new AbortController().signal);
    await Promise.resolve();
    expect(workflow.result()).toMatchObject({ running: false });
    expect(workflow.result().text).toContain('Setup failed');
  });
});
