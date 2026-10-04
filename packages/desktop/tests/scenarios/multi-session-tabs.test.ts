import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('multi-session tabs', () => {
  it('tracks tabs across two workspaces and keeps the right session active per workspace', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    expect(tabA.workspacePath).toBe('/tmp/workspace-a');

    const sendA = chat.send('hello A', webContents);
    const sessionA = getFakeSession(tabA.id);
    expect(sessionA).toBeDefined();
    await sessionA?.awaitPromptCall();
    sessionA?.finishPrompt();
    await sendA;

    const switchToB = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switchToB.ok).toBe(true);

    const tabB = await chat.createTab('/tmp/workspace-b');
    const sendB = chat.send('hello B', webContents);
    const sessionB = getFakeSession(tabB.id);
    await sessionB?.awaitPromptCall();
    sessionB?.finishPrompt();
    await sendB;

    const tabs = chat.getTabs();
    const workspaces = tabs.map((tab) => tab.workspacePath).sort();
    expect(workspaces).toEqual(['/tmp/workspace-a', '/tmp/workspace-b']);

    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-b');

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    expect(backToA.ok).toBe(true);
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');

    const status = await chat.getStatus();
    expect(status.sessionId).toBe(tabA.id);
  });

  it('isolates 16 concurrent chats with long histories across four workspaces and repeated switches', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/stress-0' });
    const running = [];
    for (let index = 0; index < 16; index++) {
      const workspace = `/tmp/stress-${index % 4}`;
      const tab = await chat.createTab(workspace);
      const completion = chat.send(`request:${index}`, newWebContents());
      const session = getFakeSession(tab.id);
      if (!session) throw new Error('Missing test session');
      await session.awaitPromptCall();
      for (let entry = 0; entry < 400; entry++) {
        session.sessionManager.appendEntry({
          id: `history:${index}:${entry}`,
          type: 'message',
          timestamp: new Date(1000 + entry).toISOString(),
          message: {
            role: entry % 2 === 0 ? 'user' : 'assistant',
            content: [{ type: 'text', text: `history:${index}:${entry} ${'long message '.repeat(100)}` }]
          }
        });
      }
      running.push({ tab, session, completion });
    }

    for (let round = 0; round < 8; round++) {
      for (let index = 0; index < running.length; index++) {
        const current = running[index];
        if (!current) throw new Error('Missing test chat');
        const { tab, session } = current;
        const text = `live:${index}:${round}`;
        const thinking = `thought:${index}:${round}`;
        const message = { role: 'assistant' as const, content: [] };
        session.pushEvent({ type: 'message_start', message });
        session.pushEvent({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: text } });
        session.pushEvent({
          type: 'message_update',
          assistantMessageEvent: { type: 'thinking_delta', delta: thinking }
        });
        const restored = await chat.activateTab(tab.id);
        expect(restored.ok).toBe(true);
        expect(restored.status?.sessionId).toBe(tab.id);
        expect(restored.status?.workspacePath).toBe(tab.workspacePath);
        expect(restored.status?.isGenerating).toBe(true);
        expect(restored.turns).toHaveLength(402);
        expect(restored.turns?.at(-1)).toMatchObject({ text, thinking, streaming: true });
        expect(restored.turns?.filter((turn) => turn.text.startsWith('live:'))).toHaveLength(1);
        expect(
          restored.turns
            ?.filter((turn) => turn.text.startsWith('history:'))
            .every((turn) => turn.text.startsWith(`history:${index}:`))
        ).toBe(true);
      }
    }
    for (const { session } of running) session.finishPrompt();
    await Promise.all(running.map(({ completion }) => completion));
    expect(chat.getTabs().every((tab) => tab.status !== 'generating')).toBe(true);
  }, 20_000);
});
