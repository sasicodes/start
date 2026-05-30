import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('session lifecycle', () => {
  it('disposes a session and removes it from getTabs when closed', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('hello', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    expect(chat.getTabs().some((entry) => entry.id === tab.id)).toBe(true);

    await chat.closeTab(tab.id);

    expect(session?.disposed).toBe(true);
    expect(chat.getTabs().some((entry) => entry.id === tab.id)).toBe(false);
  });

  it('newSession parks the current tab to the background and clears the active id', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('hi', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    await chat.newSession();
    const status = await chat.getStatus();
    expect(status.sessionId).toBeUndefined();

    const tabs = chat.getTabs();
    expect(tabs.some((entry) => entry.id === tab.id)).toBe(true);
  });

  it('rejects an empty prompt without creating a session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const result = await chat.send('   \n  ', webContents);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Prompt is empty.');
  });

  it('treats openSessionId on the already-active session as a no-op load', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('seed', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await send;

    const beforeTabs = chat.getTabs();
    const reopen = await chat.openSessionId(tab.id);

    expect(reopen.ok).toBe(true);
    expect(reopen.id).toBe(tab.id);
    expect(session?.disposed).toBe(false);
    const afterTabs = chat.getTabs();
    expect(afterTabs.map((entry) => entry.id)).toEqual(beforeTabs.map((entry) => entry.id));
  });

  it('keeps both sessions alive when the user toggles between them in quick succession', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('a', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();
    sessionA?.finishPrompt();
    await sendA;

    await chat.newSession();
    const tabB = await chat.createTab('/tmp/workspace-a');
    const sendB = chat.send('b', webContents);
    const sessionB = getFakeSession(tabB.id);
    await sessionB?.awaitPromptCall();
    sessionB?.finishPrompt();
    await sendB;

    await chat.openSessionId(tabA.id);
    await chat.openSessionId(tabB.id);
    await chat.openSessionId(tabA.id);

    expect(sessionA?.disposed).toBe(false);
    expect(sessionB?.disposed).toBe(false);
    const tabs = chat.getTabs();
    expect(tabs.some((entry) => entry.id === tabA.id)).toBe(true);
    expect(tabs.some((entry) => entry.id === tabB.id)).toBe(true);
  });

  it('parks a superseded open instead of disposing the in-flight session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const firstTab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('keep me alive', webContents);
    const firstSession = getFakeSession(firstTab.id);
    await firstSession?.awaitPromptCall();
    firstSession?.finishPrompt();
    await firstSend;

    const firstResult = await chat.openSession(firstTab.id);
    expect(firstResult.ok).toBe(true);

    const supersedingResult = await Promise.all([
      chat.openSession(firstTab.id),
      chat.newSession().then(() => ({ ok: true }))
    ]);

    expect(firstSession?.disposed).toBe(false);
    expect(supersedingResult[0].ok || supersedingResult[0].error === 'Session open was superseded.').toBe(true);
    expect(chat.getTabs().some((entry) => entry.id === firstTab.id)).toBe(true);
  });
});
