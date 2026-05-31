import { describe, expect, it } from 'vitest';
import type { ChatService } from '@main/chat';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService } from '../helpers/chat-service.js';

const activeFakeSession = async (chat: ChatService) => {
  const session = getFakeSession((await chat.createTab()).id);
  if (!session) throw new Error('expected fake session');
  return session;
};

describe('resource refresh', () => {
  it('does not create a session when focusing without an active session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    await expect(chat.refreshActiveSessionResources()).resolves.toBe(false);
  });

  it('reloads resources for an idle active session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const session = await activeFakeSession(chat);

    await expect(chat.refreshActiveSessionResources()).resolves.toBe(true);

    expect(session.reloadCount).toBe(1);
  });

  it('keeps resource refresh single-flight', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const session = await activeFakeSession(chat);

    const firstRefresh = chat.refreshActiveSessionResources();

    await expect(chat.refreshActiveSessionResources()).resolves.toBe(false);
    await expect(firstRefresh).resolves.toBe(true);

    expect(session.reloadCount).toBe(1);
  });

  it('skips refresh while the active session is generating', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const session = await activeFakeSession(chat);

    session.isStreaming = true;

    await expect(chat.refreshActiveSessionResources()).resolves.toBe(false);

    expect(session.reloadCount).toBe(0);
  });
});
