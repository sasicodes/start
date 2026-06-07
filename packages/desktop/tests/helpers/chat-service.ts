import { ChatService } from '@main/chat';
import type { WebContents } from 'electron';
import { type FakeModel, resetAgentRegistry, setAvailableModels, setModelRegistryError } from '../fakes/agent/index.js';
import { createFakeWebContents, type FakeWebContents } from '../fakes/electron.js';
import { resetStorage } from '../fakes/storage.js';
import { resetBroadcasts } from '../fakes/window.js';
import { resetWorkspaceAccess } from '../fakes/workspace-access.js';

export interface FreshServiceOptions {
  models?: FakeModel[];
  lastWorkspace?: string;
  selectedModelKey?: string;
  modelRegistryError?: string;
  onMobileSessionChanged?: (change: { sessionId: string; workspacePath: string }) => void;
}

const defaultModels: FakeModel[] = [
  {
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 200000,
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4 7',
    provider: 'anthropic'
  }
];

export const freshChatService = (options: FreshServiceOptions = {}) => {
  resetAgentRegistry();
  resetBroadcasts();
  resetWorkspaceAccess();
  resetStorage({
    ...(options.lastWorkspace ? { lastWorkspace: options.lastWorkspace } : {}),
    ...(options.selectedModelKey ? { selectedModelKey: options.selectedModelKey } : {}),
    selectedThinkingLevel: 'medium'
  });
  setModelRegistryError(options.modelRegistryError);
  setAvailableModels(options.models ?? defaultModels);

  const chat = new ChatService();
  if (options.onMobileSessionChanged) chat.setMobileSessionChangeHandler(options.onMobileSessionChanged);
  return chat;
};

export const newWebContents = (): FakeWebContents & WebContents =>
  createFakeWebContents() as FakeWebContents & WebContents;
