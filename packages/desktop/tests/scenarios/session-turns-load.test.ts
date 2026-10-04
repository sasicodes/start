import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('session turns on load', () => {
  it('returns full history on every open and never an empty streaming placeholder', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    const firstReopen = await chat.openSession(tab.id);
    const secondReopen = await chat.openSession(tab.id);

    expect(firstReopen.ok).toBe(true);
    expect(secondReopen.ok).toBe(true);
    expect(firstReopen.turns).toEqual(secondReopen.turns);
    const turns = secondReopen.turns ?? [];
    expect(turns.length).toBeGreaterThan(0);
    expect(turns.every((turn) => !turn.streaming || turn.text.length > 0)).toBe(true);
  });

  it('omits the live turn when streaming has no captured content yet', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('mid-stream', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    expect(session?.isStreaming).toBe(true);

    const reopened = await chat.openSession(tab.id);
    const streamingTurns = reopened.turns?.filter((turn) => turn.streaming) ?? [];
    for (const turn of streamingTurns) {
      expect(turn.text.length + (turn.thinking?.length ?? 0)).toBeGreaterThan(0);
    }

    session?.finishPrompt();
    await send;
  });

  it('does not replay completed text, thinking, or tools when switching back to a running chat', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('inspect files', newWebContents());
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Missing session');
    await session.awaitPromptCall();

    const content = [
      { type: 'thinking', thinking: 'Checking the files.' },
      { type: 'text', text: 'I will inspect them now.' },
      { type: 'toolCall', id: 'read-1', name: 'read', arguments: { path: '/tmp/file.txt' } }
    ];
    const message = { role: 'assistant' as const, content };
    session.pushEvent({ type: 'message_start', message });
    session.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'thinking_delta', delta: 'Checking the files.' }
    });
    session.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'I will inspect them now.' }
    });
    session.pushEvent({ type: 'message_end', message });
    session.sessionManager.appendEntry({
      id: 'answer-1',
      type: 'message',
      timestamp: new Date().toISOString(),
      message
    });
    session.pushEvent({
      type: 'tool_execution_start',
      toolCallId: 'read-1',
      toolName: 'read',
      args: { path: '/tmp/file.txt' }
    });
    const result = { content: [{ type: 'text', text: 'file contents' }] };
    session.pushEvent({ type: 'tool_execution_end', toolCallId: 'read-1', toolName: 'read', result });
    session.sessionManager.appendEntry({
      id: 'result-1',
      type: 'message',
      timestamp: new Date().toISOString(),
      message: { role: 'toolResult', toolCallId: 'read-1', toolName: 'read', ...result }
    });

    await chat.createTab('/tmp/workspace-a');
    const restored = await chat.activateTab(tab.id);
    const turns = restored.turns ?? [];
    expect(turns.filter((turn) => turn.text === 'I will inspect them now.')).toHaveLength(1);
    expect(turns.filter((turn) => turn.thinking === 'Checking the files.')).toHaveLength(1);
    expect(turns.flatMap((turn) => turn.details ?? []).filter((detail) => detail.key === 'tool:read-1')).toHaveLength(
      1
    );

    session.pushEvent({ type: 'message_start', message: { role: 'assistant', content: [] } });
    session.pushEvent({
      type: 'message_update',
      assistantMessageEvent: { type: 'thinking_delta', delta: 'Next step.' }
    });
    await chat.createTab('/tmp/workspace-a');
    const next = await chat.activateTab(tab.id);
    expect(next.turns?.filter((turn) => turn.thinking?.includes('Next step.'))).toHaveLength(1);
    expect(
      next.turns?.flatMap((turn) => turn.details ?? []).filter((detail) => detail.key === 'tool:read-1')
    ).toHaveLength(1);
    session.finishPrompt();
    await send;
  });
});
