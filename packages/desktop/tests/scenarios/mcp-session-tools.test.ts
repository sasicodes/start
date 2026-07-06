import { describe, expect, it, vi } from 'vitest';
import { getFakeSession, listFakeSessions } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

vi.mock('@main/mcp/tools', () => ({
  warmMcpServers: () => {},
  mcpToolsForSession: async () => [{ name: 'github_create_issue' }]
}));

const toolNames = (sessionId: string) => (getFakeSession(sessionId)?.getAllTools() ?? []).map((tool) => tool.name);

describe('mcp session tools', () => {
  it('adds mcp and web search tools to the lazily created session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const sendPromise = chat.send('hello', webContents);
    await vi.waitFor(() => expect(listFakeSessions()).toHaveLength(1));
    const session = listFakeSessions()[0];
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    const names = (session?.getAllTools() ?? []).map((tool) => tool.name);
    expect(names).toContain('web_search');
    expect(names).toContain('github_create_issue');
  });

  it('adds mcp and web search tools to explicitly created tabs', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createTab('/tmp/workspace-a');

    expect(toolNames(tab.id)).toContain('web_search');
    expect(toolNames(tab.id)).toContain('github_create_issue');
  });
});
