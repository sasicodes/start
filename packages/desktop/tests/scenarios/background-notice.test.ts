import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { broadcastsByChannel } from '../fakes/window.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('background notices', () => {
  it('persists a completed notice when a session finishes while the user is on another workspace', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('long running', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();

    const switched = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switched.ok).toBe(true);

    sessionA?.finishPrompt();
    await sendA;

    const notices = await chat.getNotices();
    expect(notices.length).toBe(1);
    expect(notices[0]?.kind).toBe('completed');
    expect(notices[0]?.sessionId).toBe(tabA.id);
    expect(notices[0]?.workspacePath).toBe('/tmp/workspace-a');

    const persisted = getStorageSnapshot();
    expect(persisted.sessionNotices?.[tabA.id]?.kind).toBe('completed');
  });

  it('persists a failed notice and broadcasts a scoped error when a background session fails', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('will fail', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();

    const switched = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switched.ok).toBe(true);

    sessionA?.failPrompt('network exploded');
    const result = await sendA;
    expect(result.ok).toBe(false);
    expect(result.error).toBe('network exploded');

    const notices = await chat.getNotices();
    expect(notices[0]?.kind).toBe('failed');

    const scopedErrors = broadcastsByChannel('chat:scoped-error');
    expect(scopedErrors.length).toBeGreaterThan(0);
    const payload = scopedErrors.at(-1)?.args[0] as { tabId: string; payload: string; workspacePath: string };
    expect(payload.tabId).toBe(tabA.id);
    expect(payload.workspacePath).toBe('/tmp/workspace-a');
    expect(payload.payload).toBe('network exploded');
  });

  it('keeps the notice until the renderer confirms the session was seen', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('hello', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();
    await chat.switchWorkspace('/tmp/workspace-b');
    sessionA?.finishPrompt();
    await sendA;

    expect((await chat.getNotices()).length).toBe(1);

    await chat.activateTab(tabA.id);
    expect((await chat.getNotices()).length).toBe(1);

    await chat.markSessionNoticeSeen(tabA.id);
    expect((await chat.getNotices()).length).toBe(0);
  });

  it('clears a persisted notice when the user opens that tab again', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('hello', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();
    await chat.switchWorkspace('/tmp/workspace-b');
    sessionA?.finishPrompt();
    await sendA;

    expect((await chat.getNotices()).length).toBe(1);
    expect(getStorageSnapshot().sessionNotices?.[tabA.id]).toBeDefined();

    const reopened = await chat.activateTab(tabA.id);
    expect(reopened.ok).toBe(true);

    expect((await chat.getNotices()).length).toBe(1);
    expect(getStorageSnapshot().sessionNotices?.[tabA.id]).toBeDefined();

    await chat.markSessionNoticeSeen(tabA.id);

    expect((await chat.getNotices()).length).toBe(0);
    expect(getStorageSnapshot().sessionNotices?.[tabA.id]).toBeUndefined();
  });
});
