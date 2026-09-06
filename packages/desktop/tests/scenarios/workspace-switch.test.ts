import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import * as resources from '@main/prompt/loader';
import * as sessions from '@main/sessions';
import { describe, expect, it, vi } from 'vitest';
import { FakeSessionManager, getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { broadcastsByChannel } from '../fakes/window.js';
import { activationLog } from '../fakes/workspace-access.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';
import { deferred } from '../helpers/deferred.js';

const workspaceTempRoot = () => mkdtempSync(path.join(tmpdir(), 'start-workspaces-'));

const removeTempRoot = (root: string) => rmSync(root, { recursive: true, force: true });

const seedStoredSession = (cwd: string) => {
  const stored = FakeSessionManager.create(cwd);
  stored.appendEntry({
    id: 'entry-1',
    type: 'message',
    timestamp: new Date().toISOString(),
    message: { role: 'user', content: 'stored prompt' }
  });
  return stored;
};

describe('workspace switching', () => {
  it('moves the current session to background and restores it when the workspace is reopened', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('one', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();

    const switchToB = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switchToB.ok).toBe(true);
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-b');

    const tabsAfterSwitch = chat.getTabs();
    const stillReporting = tabsAfterSwitch.find((tab) => tab.id === tabA.id);
    expect(stillReporting?.status).toBe('generating');

    sessionA?.finishPrompt();
    await sendA;

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    expect(backToA.ok).toBe(true);
    expect(backToA.session?.id).toBe(tabA.id);
    expect(backToA.session?.turns?.map((turn) => turn.text)).toEqual(['one']);
    expect((await chat.getStatus()).sessionId).toBe(tabA.id);
  });

  it('ignores a workspace switch superseded by a tab activation during auth refresh', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('one', webContents);
    const sessionA = getFakeSession(tabA.id);
    if (!sessionA) throw new Error('Expected fake session.');
    await sessionA.awaitPromptCall();
    await chat.switchWorkspace('/tmp/workspace-b');

    const pendingSwitch = chat.switchWorkspace('/tmp/workspace-c');
    const activation = await chat.activateTab(tabA.id);
    const superseded = await pendingSwitch;

    expect(activation.ok).toBe(true);
    expect(superseded).toEqual(expect.objectContaining({ ok: true, unchanged: true }));
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');
    expect((await chat.getStatus()).sessionId).toBe(tabA.id);

    sessionA.finishPrompt();
    await sendA;
  });

  it('does not carry prior assistant message text into a later message of the same turn', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('go', webContents);
    const sessionA = getFakeSession(tabA.id);
    if (!sessionA) throw new Error('Expected fake session.');
    await sessionA.awaitPromptCall();

    sessionA.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'first answer' }
    });
    sessionA.pushEvent({ type: 'message_start', message: { role: 'assistant', content: '' } });
    sessionA.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'second answer' }
    });

    await chat.switchWorkspace('/tmp/workspace-b');
    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    const streamingTurn = backToA.session?.turns?.find((turn) => turn.streaming);
    expect(streamingTurn?.text).toBe('second answer');

    sessionA.finishPrompt();
    await sendA;
  });

  it('restores a background stream without replaying buffered output', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('one', webContents);
    const sessionA = getFakeSession(tabA.id);
    if (!sessionA) throw new Error('Expected fake session.');
    await sessionA.awaitPromptCall();
    await chat.switchWorkspace('/tmp/workspace-b');

    sessionA.pushEvent({
      type: 'tool_execution_start',
      toolCallId: 'read-1',
      toolName: 'read',
      args: { path: '/tmp/a' }
    });
    sessionA.pushEvent({
      type: 'tool_execution_end',
      toolCallId: 'read-1',
      toolName: 'read',
      result: { output: 'A' }
    });
    sessionA.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'background answer' }
    });

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    const streamingTurn = backToA.session?.turns?.find((turn) => turn.streaming);

    expect(backToA.session?.status?.isGenerating).toBe(true);
    expect(streamingTurn?.text).toBe('background answer');
    expect(streamingTurn?.details).toEqual([expect.objectContaining({ key: 'tool:read-1', count: 2, state: 'done' })]);

    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(
      broadcastsByChannel('chat:scoped-delta').filter((event) => {
        const payload = event.args[0] as { tabId: string; payload: string };
        return payload.tabId === tabA.id && payload.payload === 'background answer';
      })
    ).toHaveLength(0);

    sessionA.finishPrompt();
    await sendA;
  });

  it('opens the most recent stored session when switching into a workspace with history', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const stored = seedStoredSession('/tmp/workspace-b');

    const result = await chat.switchWorkspace('/tmp/workspace-b');

    expect(result.ok).toBe(true);
    expect(result.session?.id).toBe(stored.getSessionId());
    expect(result.session?.turns?.map((turn) => turn.text)).toEqual(['stored prompt']);
    expect((await chat.getStatus()).sessionId).toBe(stored.getSessionId());
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-b');
  });

  it('only scans the destination workspace when restoring history', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const stored = seedStoredSession('/tmp/workspace-b');
    seedStoredSession('/tmp/workspace-c');
    const list = vi.spyOn(FakeSessionManager, 'list');
    const listAll = vi.spyOn(FakeSessionManager, 'listAll');

    const result = await chat.switchWorkspace('/tmp/workspace-b');

    expect(result.session?.id).toBe(stored.getSessionId());
    expect(list).toHaveBeenCalledExactlyOnceWith('/tmp/workspace-b');
    expect(listAll).not.toHaveBeenCalled();
  });

  it('restores the newest nonempty, unarchived session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const older = seedStoredSession('/tmp/workspace-b');
    const recent = seedStoredSession('/tmp/workspace-b');
    const archived = seedStoredSession('/tmp/workspace-b');
    const empty = FakeSessionManager.create('/tmp/workspace-b');
    const stored = await FakeSessionManager.list('/tmp/workspace-b');
    const times = new Map([
      [older.getSessionId(), 1],
      [recent.getSessionId(), 2],
      [archived.getSessionId(), 3],
      [empty.getSessionId(), 4]
    ]);
    vi.spyOn(FakeSessionManager, 'list').mockResolvedValue(
      stored.map((session) => ({ ...session, modified: new Date(times.get(session.id) ?? 0) }))
    );
    vi.spyOn(sessions, 'getSession').mockImplementation((id) => {
      if (id !== archived.getSessionId()) return;
      return {
        id,
        path: id,
        createdAt: 0,
        updatedAt: 0,
        archived: true,
        title: 'Archived',
        totalInputTokens: 0,
        totalOutputTokens: 0,
        cwd: '/tmp/workspace-b'
      };
    });

    const result = await chat.switchWorkspace('/tmp/workspace-b');

    expect(result.session?.id).toBe(recent.getSessionId());
  });

  it('ignores a history scan superseded by another workspace selection', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    seedStoredSession('/tmp/workspace-b');
    const stored = await FakeSessionManager.list('/tmp/workspace-b');
    const scan = deferred<typeof stored>();
    const started = deferred<void>();
    const open = vi.spyOn(FakeSessionManager, 'open');
    vi.spyOn(FakeSessionManager, 'list').mockImplementationOnce(() => {
      started.resolve();
      return scan.promise;
    });

    const pending = chat.switchWorkspace('/tmp/workspace-b');
    await started.promise;
    await chat.switchWorkspace('/tmp/workspace-c', { restoreSession: false });
    scan.resolve(stored);
    const result = await pending;

    expect(result).toMatchObject({ ok: true, unchanged: true });
    expect(result.session).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-c');
    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-c');
  });

  it('ignores a history restore superseded while resources load', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    seedStoredSession('/tmp/workspace-b');
    const loading = deferred<Awaited<ReturnType<typeof resources.createStartResourceLoader>>>();
    const started = deferred<void>();
    const loader = await resources.createStartResourceLoader('/tmp/workspace-b');
    vi.spyOn(resources, 'createStartResourceLoader').mockImplementationOnce(() => {
      started.resolve();
      return loading.promise;
    });

    const pending = chat.switchWorkspace('/tmp/workspace-b');
    await started.promise;
    await chat.switchWorkspace('/tmp/workspace-c', { restoreSession: false });
    loading.resolve(loader);
    const result = await pending;

    expect(result).toMatchObject({ ok: true, unchanged: true });
    expect(result.session).toBeUndefined();
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-c');
    expect((await chat.getStatus()).sessionId).toBeUndefined();
  });

  it('keeps a newly created session when a previous history scan finishes', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    seedStoredSession('/tmp/workspace-b');
    const stored = await FakeSessionManager.list('/tmp/workspace-b');
    const scan = deferred<typeof stored>();
    const started = deferred<void>();
    vi.spyOn(FakeSessionManager, 'list').mockImplementationOnce(() => {
      started.resolve();
      return scan.promise;
    });

    const pending = chat.switchWorkspace('/tmp/workspace-b');
    await started.promise;
    await chat.newSession();
    scan.resolve(stored);
    const result = await pending;

    expect(result).toMatchObject({ ok: true, unchanged: true });
    expect(result.session).toBeUndefined();
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-b');
    expect((await chat.getStatus()).sessionId).toBeUndefined();
  });

  it('skips session restore when the caller opts out', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    seedStoredSession('/tmp/workspace-b');

    const result = await chat.switchWorkspace('/tmp/workspace-b', { restoreSession: false });

    expect(result.ok).toBe(true);
    expect(result.session).toBeUndefined();
    expect((await chat.getStatus()).sessionId).toBeUndefined();
  });

  it('starts fresh when switching into a workspace without stored sessions', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const result = await chat.switchWorkspace('/tmp/workspace-empty');

    expect(result.ok).toBe(true);
    expect(result.session).toBeUndefined();
    expect((await chat.getStatus()).sessionId).toBeUndefined();
  });

  it('does not reset the active session when selecting the current workspace', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('one', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    const result = await chat.switchWorkspace('/tmp/workspace-a');
    const status = await chat.getStatus();

    expect(result).toEqual(expect.objectContaining({ ok: true, unchanged: true }));
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');
    expect(status.sessionId).toBe(tab.id);
    expect(status.isGenerating).toBe(true);

    await chat.abort();
    session.finishPrompt();
    await send;
  });

  it('persists lastWorkspace whenever the workspace changes', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    await chat.switchWorkspace('/tmp/workspace-c');

    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-c');
    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-c');
    expect(activationLog()).toContain('/tmp/workspace-c');
  });

  it('keeps the previous workspace in history when switching', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    await chat.switchWorkspace('/tmp/workspace-c');

    const history = getStorageSnapshot().workspaceHistory ?? {};
    expect(history).toHaveProperty('/tmp/workspace-a');
    expect(history).toHaveProperty('/tmp/workspace-c');
  });

  it('shows remembered workspaces even before they have sessions', async () => {
    const root = workspaceTempRoot();
    try {
      const workspaceA = path.join(root, 'workspace-a');
      const workspaceC = path.join(root, 'workspace-c');
      mkdirSync(workspaceA, { recursive: true });
      mkdirSync(workspaceC, { recursive: true });
      const chat = freshChatService({ lastWorkspace: workspaceA });
      await chat.switchWorkspace(workspaceC);

      expect((await chat.getWorkspaceFolders()).map((folder) => folder.path)).toEqual([workspaceC, workspaceA]);
    } finally {
      removeTempRoot(root);
    }
  });

  it('drops deleted workspaces from the folder list and remembered history', async () => {
    const root = workspaceTempRoot();
    try {
      const workspacePath = path.join(root, 'workspace-a');
      const deletedPath = path.join(root, 'workspace-gone');
      mkdirSync(workspacePath, { recursive: true });
      const chat = freshChatService({ lastWorkspace: workspacePath });
      await chat.switchWorkspace(deletedPath);
      await chat.switchWorkspace(workspacePath);

      expect((await chat.getWorkspaceFolders()).map((folder) => folder.path)).toEqual([workspacePath]);
      expect(getStorageSnapshot().workspaceHistory).not.toHaveProperty(deletedPath);
    } finally {
      removeTempRoot(root);
    }
  });

  it('falls back to the user home directory when no workspace was previously saved', () => {
    const chat = freshChatService();
    expect(chat.getWorkspaceCwd()).toBe(homedir());
    expect(getStorageSnapshot().workspaceHistory).toHaveProperty(homedir());
  });

  it('rejects empty workspace paths without mutating state', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const result = await chat.switchWorkspace('   ');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Workspace path is empty.');
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');
  });
});
