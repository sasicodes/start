import {
  runCreateSession,
  runListSessions,
  runReadSession,
  runSendMessage,
  type SessionController,
  type SessionSummary
} from '@main/providers/tools/sessions';
import { describe, expect, it, vi } from 'vitest';

const summary = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  id: 's1',
  status: 'idle',
  isolated: false,
  workspacePath: '/repo',
  ...over
});

const controller = (over: Partial<SessionController> = {}): SessionController => ({
  create: vi.fn(async ({ environment }) =>
    summary({
      id: 'new',
      isolated: environment.type === 'worktree',
      workspacePath: environment.type === 'worktree' ? '/wt' : '/repo'
    })
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
    const result = await runCreateSession(ctrl, { prompt: 'do x', environment: { type: 'worktree', branch: 'main' } });
    expect(ctrl.create).toHaveBeenCalledWith({ prompt: 'do x', environment: { type: 'worktree', branch: 'main' } });
    expect(result.content[0]?.text).toContain('Created worktree session');
  });

  it('rejects an empty prompt without creating a session', async () => {
    const ctrl = controller();
    const result = await runCreateSession(ctrl, { prompt: '  ' });
    expect(ctrl.create).not.toHaveBeenCalled();
    expect(result.content[0]?.text).toContain('non-empty prompt');
  });

  it('reports creation failure without starting a fallback session', async () => {
    const ctrl = controller({
      create: async () => {
        throw new Error('fatal: invalid reference');
      }
    });
    const result = await runCreateSession(ctrl, { prompt: 'do x', environment: { type: 'worktree' } });
    expect(result.content[0]?.text).toBe('Could not create worktree session: fatal: invalid reference');
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

  it('marks isolated sessions', () => {
    const ctrl = controller({ list: () => [summary({ id: 'w', isolated: true, workspacePath: '/wt' })] });
    expect(runListSessions(ctrl, {}).content[0]?.text).toBe('w [idle] (worktree) /wt');
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

  it('rejects an empty message without sending', () => {
    const ctrl = controller();
    runSendMessage(ctrl, { id: 's1', prompt: '   ' });
    expect(ctrl.send).not.toHaveBeenCalled();
  });

  it('refuses an unknown session', () => {
    const ctrl = controller({ list: () => [] });
    runSendMessage(ctrl, { id: 'nope', prompt: 'more' });
    expect(ctrl.send).not.toHaveBeenCalled();
  });
});
