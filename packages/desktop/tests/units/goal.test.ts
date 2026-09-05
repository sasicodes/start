import type { SessionManager } from '@earendil-works/pi-coding-agent';
import { createGoalController } from '@main/goal/controller';
import { describe, expect, it, vi } from 'vitest';

const fixture = () => {
  const entries: ReturnType<SessionManager['getBranch']> = [];
  const onChange = vi.fn();
  const manager: Pick<SessionManager, 'getBranch' | 'appendCustomEntry'> = {
    getBranch: () => entries,
    appendCustomEntry: (customType, data) => {
      const id = String(entries.length);
      entries.push({ type: 'custom', id, customType, data, parentId: null, timestamp: new Date().toISOString() });
      return id;
    }
  };
  return { entries, manager, onChange, controller: createGoalController(manager, onChange) };
};

describe('goal controller', () => {
  it('starts only an explicit nonempty bounded objective and persists changes', () => {
    const { controller, entries, onChange } = fixture();
    expect(controller.get()).toBeNull();
    expect(controller.continuation()).toBe('');
    expect(controller.beginIteration()).toBe(false);
    expect(() => controller.start(' ')).toThrow();
    expect(() => controller.start('x'.repeat(8001))).toThrow();
    controller.start('  ship the fix  ');
    expect(controller.get()).toEqual({ objective: 'ship the fix', status: 'active', iterations: 0 });
    expect(entries.at(-1)).toMatchObject({ customType: 'start-goal', data: controller.get() });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(controller.continuation()).toBe('Continue toward the active goal.');
    expect(() => controller.start('replace it')).toThrow();
  });

  it('pauses, resumes and cancels while preserving cumulative iterations', () => {
    const { controller } = fixture();
    controller.pause();
    controller.cancel();
    expect(() => controller.resume()).toThrow();
    controller.start('test');
    expect(() => controller.resume()).toThrow();
    expect(controller.beginIteration()).toBe(true);
    controller.pause(' user stopped ');
    expect(controller.get()).toMatchObject({ status: 'paused', reason: 'user stopped', iterations: 1 });
    expect(controller.continuation()).toBe('');
    expect(controller.beginIteration()).toBe(false);
    expect(() => controller.start('replace')).toThrow();
    controller.resume();
    expect(controller.get()).not.toHaveProperty('reason');
    controller.cancel();
    expect(controller.get()).toMatchObject({ status: 'cancelled', iterations: 1 });
    controller.start('new');
    expect(controller.get()?.iterations).toBe(0);
  });

  it('requires an active goal and a bounded explanation for completion or blocking', () => {
    const { controller } = fixture();
    expect(() => controller.finish('completed', 'done')).toThrow();
    controller.start('test');
    expect(() => controller.finish('completed', '')).toThrow();
    expect(() => controller.finish('blocked', 'x'.repeat(2001))).toThrow();
    expect(() => controller.pause('x'.repeat(2001))).toThrow();
    controller.finish('blocked', 'Needs login');
    expect(controller.get()).toMatchObject({ status: 'paused', reason: 'Needs login' });
    expect(() => controller.finish('completed', 'done')).toThrow();
    controller.resume();
    controller.finish('completed', 'Verified all requirements');
    controller.pause();
    controller.cancel();
    expect(controller.get()?.status).toBe('completed');
    expect(controller.continuation()).toBe('');
    controller.start('next');
    controller.pause();
    expect(controller.get()).not.toHaveProperty('reason');
  });

  it('bounds each run to 20 iterations and grants a new allowance on explicit resume', () => {
    const { controller } = fixture();
    controller.start('test');
    for (let index = 0; index < 20; index += 1) expect(controller.beginIteration()).toBe(true);
    expect(controller.get()?.iterations).toBe(20);
    expect(controller.beginIteration()).toBe(false);
    expect(controller.get()).toMatchObject({ status: 'paused', iterations: 20 });
    controller.resume();
    expect(controller.beginIteration()).toBe(true);
    expect(controller.get()?.iterations).toBe(21);
  });

  it('restores active goals as paused without side effects until explicitly resumed', () => {
    const { controller, manager } = fixture();
    controller.start('test');
    controller.beginIteration();
    const onChange = vi.fn();
    const restored = createGoalController(manager, onChange);
    expect(restored.get()).toMatchObject({ objective: 'test', status: 'paused', iterations: 1 });
    expect(restored.beginIteration()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    restored.resume();
    expect(restored.beginIteration()).toBe(true);
    expect(restored.get()?.iterations).toBe(2);
  });

  it.each(['paused', 'completed', 'cancelled'] as const)('restores %s goals unchanged', (status) => {
    const { manager } = fixture();
    const goal = { status, objective: 'test', iterations: 3, reason: 'saved' };
    manager.appendCustomEntry('start-goal', goal);
    expect(createGoalController(manager, vi.fn()).get()).toEqual(goal);
  });

  it('ignores malformed latest goal data and unrelated custom entries', () => {
    const { manager } = fixture();
    manager.appendCustomEntry('other', { objective: 'wrong', status: 'active', iterations: 0 });
    expect(createGoalController(manager, vi.fn()).get()).toBeNull();
    for (const data of [
      null,
      { objective: 'bad', status: 'active', iterations: -1 },
      { objective: '', status: 'active', iterations: 0 }
    ]) {
      manager.appendCustomEntry('start-goal', data);
      expect(createGoalController(manager, vi.fn()).get()).toBeNull();
    }
  });

  it('does not expose mutable state or change memory if persistence fails', () => {
    const { controller, manager } = fixture();
    controller.start('test');
    const snapshot = controller.get();
    if (!snapshot) throw new Error('Expected goal');
    snapshot.status = 'completed';
    expect(controller.get()?.status).toBe('active');
    manager.appendCustomEntry = () => {
      throw new Error('disk full');
    };
    expect(() => controller.pause()).toThrow('disk full');
    expect(controller.get()?.status).toBe('active');
  });
});
