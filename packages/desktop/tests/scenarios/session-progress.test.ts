import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { eventsByChannel } from '../fakes/electron.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('session progress', () => {
  it('forwards text and thinking deltas to the active web contents', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('start', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    session?.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'thinking_delta', delta: 'pondering…' }
    });
    session?.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'Hi there' }
    });

    session?.finishPrompt();
    await sendPromise;

    const deltas = eventsByChannel(webContents, 'chat:delta').map((event) => event.args[0]);
    const thinking = eventsByChannel(webContents, 'chat:thinking-delta').map((event) => event.args[0]);
    expect(deltas).toEqual(['Hi there']);
    expect(thinking).toEqual(['pondering…']);

    const done = eventsByChannel(webContents, 'chat:done');
    expect(done.length).toBe(1);
  });

  it('captures tool execution events as chat events on the active tab', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('use tool', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    session?.pushEvent({
      type: 'tool_execution_start',
      toolCallId: 'call-1',
      toolName: 'read',
      args: { path: '/tmp/foo' }
    });
    session?.pushEvent({
      type: 'tool_execution_end',
      toolCallId: 'call-1',
      toolName: 'read',
      result: { output: 'ok' }
    });
    session?.finishPrompt();
    await sendPromise;

    const events = eventsByChannel(webContents, 'chat:event');
    const titles = events.map((event) => (event.args[0] as { title: string }).title);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.some((title) => title.startsWith('Read'))).toBe(true);
  });

  it('reports isGenerating in status while a prompt is in flight', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('progress', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    const midStatus = await chat.getStatus();
    expect(midStatus.isGenerating).toBe(true);

    session?.finishPrompt();
    await sendPromise;

    const endStatus = await chat.getStatus();
    expect(endStatus.isGenerating).toBe(false);
  });

  it('notifies mobile listeners when a session starts and finishes generating', async () => {
    const changes: Array<{ sessionId: string; workspacePath: string }> = [];
    const chat = freshChatService({
      lastWorkspace: '/tmp/workspace-a',
      onMobileSessionChanged: (change) => changes.push(change)
    });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('mobile progress', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    expect(changes).toContainEqual({ sessionId: tab.id, workspacePath: '/tmp/workspace-a' });

    session?.finishPrompt();
    await sendPromise;

    expect(changes.filter((change) => change.sessionId === tab.id).length).toBeGreaterThanOrEqual(2);
  });
});
