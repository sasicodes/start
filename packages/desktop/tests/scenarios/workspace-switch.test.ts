import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FakeSessionManager, getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { activationLog } from '../fakes/workspace-access.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

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

    await chat.abort(webContents);
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
