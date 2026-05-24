import type { AgentSession } from '@earendil-works/pi-coding-agent';
import type { AgentTab, AgentTabStatus, SessionNotice } from '@main/types';

const sessionStatus = (session: AgentSession, notice?: SessionNotice): AgentTabStatus => {
  if (notice) return notice.kind;
  if (session.isStreaming || session.isBashRunning) return 'generating';
  return 'idle';
};

export const sessionWorkspacePath = (session: AgentSession, fallback: string) =>
  session.sessionManager.getCwd() || fallback;

export const tabFromSession = (
  session: AgentSession,
  fallbackWorkspacePath: string,
  notice?: SessionNotice
): AgentTab => {
  const sessionId = session.sessionManager.getSessionId();

  return {
    id: sessionId,
    sessionId,
    status: sessionStatus(session, notice),
    workspacePath: sessionWorkspacePath(session, fallbackWorkspacePath)
  };
};
