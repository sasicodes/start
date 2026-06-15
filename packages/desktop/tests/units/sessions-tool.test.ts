import {
  type SessionController,
  type SessionSummary,
  runCreateSession,
  runListSessions,
  runReadSession,
  runSendMessage
} from '@main/providers/tools/sessions';
import { describe, expect, it, vi } from 'vitest';

const summary = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  id: 's1',
  status: 'idle',
  workspacePath: '/repo',
  ...over
});

const controller = (over: Partial<SessionController> = {}): SessionController => ({
  create: vi.fn(async ({ environment }) =>
    summary({ id: 'new', workspacePath: environment.type === 'worktree' ? '/wt' : '/repo' })
  ),
  send: vi.fn(),
  list: vi.fn(() => [summary()]),
  read: vi.fn(() => [{ role: 'user', text: 'hi' }]),
  ...over
});

describe('create_session', () => {
  it('creates a local session by default', async () => {
    const ctrl = controller();
    const result = await runCreateSession(ctrl, { prompt: 'do x' });
    expect(ctrl.create).toHaveBeenCalledWith({ prompt: 'do x', environment: { type: 'local' } });
    expect(result.content[0]?.text).toContain('Created local session');
  });

  it('passes the base branch for a worktree session', async () => {
    const ctrl = controller();
    await runCreateSession(ctrl, { prompt: 'do x', environment: { type: 'worktree', branch: 'main' } });
    expect(ctrl.create).toHaveBeenCalledWith({ prompt: 'do x', environment: { type: 'worktree', branch: 'main' } });
  });
});

describe('list_sessions', () => {
  it('filters by query', () => {
    const ctrl = controller({
      list: () => [summary({ id: 'a', workspacePath: '/x' }), summary({ id: 'b', workspacePath: '/y' })]
    });
    const result = runListSessions(ctrl, { query: '/y' });
    expect(result.content[0]?.text).toBe('b [idle] /y');
  });
});

describe('read_session', () => {
  it('reports an unknown session', () => {
    const ctrl = controller({ read: () => null });
    expect(runReadSession(ctrl, { id: 'missing' }).content[0]?.text).toContain('No session found');
  });

  it('renders recent turns within the char limit', () => {
    const ctrl = controller({ read: () => [{ role: 'assistant', text: 'abcdef' }] });
    const result = runReadSession(ctrl, { id: 's1', maxOutputCharsPerItem: 3 });
    expect(result.content[0]?.text).toBe('assistant: abc…');
  });
});

describe('send_message_to_session', () => {
  it('sends to a known session', () => {
    const ctrl = controller();
    runSendMessage(ctrl, { id: 's1', prompt: 'more' });
    expect(ctrl.send).toHaveBeenCalledWith('s1', 'more');
  });

  it('refuses an unknown session', () => {
    const ctrl = controller({ list: () => [] });
    runSendMessage(ctrl, { id: 'nope', prompt: 'more' });
    expect(ctrl.send).not.toHaveBeenCalled();
  });
});
