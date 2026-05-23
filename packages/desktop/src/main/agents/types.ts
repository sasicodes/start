import type { AgentSession } from '@earendil-works/pi-coding-agent';
import type { AgentTab, SessionNotice } from '@main/types';
import type { WebContents } from 'electron';

export interface AgentTabController {
  tab: AgentTab;
  session: AgentSession | null;
}

export interface AgentRegistry {
  activeTabId: string | undefined;
  controllers: Map<string, AgentTabController>;
}

export interface WorkspaceRegistry {
  activeWorkspacePath: string;
  tabIdsByWorkspacePath: Map<string, string[]>;
}

export interface EventRouter {
  emit<T>(webContents: WebContents, channel: string, tabId: string, workspacePath: string, payload: T): void;
}

export interface NoticeStore {
  list(): SessionNotice[];
  set(notice: SessionNotice): void;
  markSeen(sessionId: string): void;
}
