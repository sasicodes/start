import type { AgentSession, SessionManager } from '@earendil-works/pi-coding-agent';
import type { AgentTab, AgentTabStatus, SessionNotice } from '@main/types';

export const sessionStatus = (session: AgentSession, notice?: SessionNotice): AgentTabStatus =>
  notice?.kind ?? (session.isStreaming || session.isBashRunning ? 'generating' : 'idle');

export const sessionWorkspacePath = (sessionManager: SessionManager, fallback: string) =>
  sessionManager.getCwd() || fallback;

export const tabFromSession = (
  session: AgentSession,
  fallbackWorkspacePath: string,
  notice?: SessionNotice
): AgentTab => {
  const sessionId = session.sessionManager.getSessionId();
  return {
    id: sessionId,
    status: sessionStatus(session, notice),
    sessionId,
    workspacePath: sessionWorkspacePath(session.sessionManager, fallbackWorkspacePath)
  };
};
