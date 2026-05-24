import { describe, expect, it } from 'vitest';
import { type FakeAgentSessionEvent, getFakeSession } from '../fakes/agent/index.js';
import { eventsByChannel } from '../fakes/electron.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('event replay', () => {
  it('reproduces the same renderer events for a fixed recorded SDK stream', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('replay', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    const recordedStream: FakeAgentSessionEvent[] = [
      { type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta: 'thinking 1 ' } },
      { type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta: 'thinking 2' } },
      { type: 'tool_execution_start', toolCallId: 't-1', toolName: 'read', args: { path: '/tmp/a' } },
      { type: 'tool_execution_end', toolCallId: 't-1', toolName: 'read', result: { output: 'A' } },
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Final answer ' } },
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'is 42.' } }
    ];

    for (const event of recordedStream) session?.pushEvent(event);
    session?.finishPrompt();
    await sendPromise;

    const textDeltas = eventsByChannel(webContents, 'chat:delta').map((event) => event.args[0]);
    const thinkingDeltas = eventsByChannel(webContents, 'chat:thinking-delta').map((event) => event.args[0]);
    expect(textDeltas.join('')).toBe('Final answer is 42.');
    expect(thinkingDeltas.join('')).toBe('thinking 1 thinking 2');

    const events = eventsByChannel(webContents, 'chat:event');
    const titles = events.map((event) => event.args[0] as { title: string; state: string });
    expect(titles.some((event) => event.title.startsWith('Explor') && event.state === 'active')).toBe(true);
    expect(titles.some((event) => event.title.startsWith('Explor') && event.state === 'done')).toBe(true);

    const done = eventsByChannel(webContents, 'chat:done');
    expect(done.length).toBe(1);
  });

  it('emits scoped events for background sessions while the active session sees raw channels', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('replay', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    await chat.switchWorkspace('/tmp/workspace-b');

    session?.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'background delta' }
    });
    session?.finishPrompt();
    await sendPromise;

    expect(eventsByChannel(webContents, 'chat:delta')).toHaveLength(0);
    const scopedDeltas = webContents.events.concat([]).filter((event) => event.channel === 'chat:scoped-delta');
    expect(scopedDeltas).toHaveLength(0);
  });
});
