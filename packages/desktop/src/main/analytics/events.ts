import {
  type AnalyticsEvent,
  modelAnalyticsProperties,
  sessionAnalyticsProperties,
  trackAnalyticsEvent,
  workspaceAnalyticsProperties
} from '@main/analytics/index';
import type { ChatService } from '@main/chat';

type AnalyticsProperties = Record<string, null | number | string | boolean>;
type Attachments = readonly unknown[];

const attachmentProperties = (attachments: Attachments): AnalyticsProperties => ({
  attachment_count: attachments.length,
  has_attachments: attachments.length > 0
});

const chatStatusProperties = async (chat: ChatService): Promise<AnalyticsProperties> => {
  try {
    const status = await chat.getStatus();
    return {
      ...modelAnalyticsProperties(status.selectedModelKey),
      ...sessionAnalyticsProperties(status.sessionId),
      ...workspaceAnalyticsProperties(status.workspacePath),
      ...(status.thinkingLevel ? { thinking_level: status.thinkingLevel } : {})
    };
  } catch {
    return {};
  }
};

const trackWithChatStatus = (chat: ChatService, event: AnalyticsEvent, properties: AnalyticsProperties) => {
  void chatStatusProperties(chat).then((status) => trackAnalyticsEvent(event, { ...status, ...properties }));
};

export const trackAppOpened = (composerShortcut: string, workspacePath?: string) =>
  trackAnalyticsEvent('app_opened', {
    composer_shortcut: composerShortcut,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export const trackQuickAccessToggled = (source: 'menu' | 'shortcut', workspacePath?: string) =>
  trackAnalyticsEvent('quick_access_toggled', {
    source,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export const trackSessionCreated = (source: 'menu' | 'renderer' | 'tab', workspacePath?: string) =>
  trackAnalyticsEvent('session_created', {
    source,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export const trackComposerSubmitted = (prompt: string, attachments: Attachments, workspacePath?: string) =>
  trackAnalyticsEvent('composer_submitted', {
    prompt_length: prompt.length,
    ...attachmentProperties(attachments),
    ...workspaceAnalyticsProperties(workspacePath)
  });

export interface ShortcutChangedParams {
  ok: boolean;
  changed: boolean;
  composerShortcut: string;
  previousComposerShortcut?: string;
}

export const trackShortcutChanged = ({
  ok,
  changed,
  composerShortcut,
  previousComposerShortcut
}: ShortcutChangedParams) =>
  trackAnalyticsEvent('shortcut_changed', {
    ok,
    changed,
    composer_shortcut: composerShortcut,
    ...(previousComposerShortcut ? { previous_composer_shortcut: previousComposerShortcut } : {})
  });

export const trackUpdateInstalled = () => trackAnalyticsEvent('update_installed');

export const trackSubscriptionLoginStarted = (provider: string, workspacePath?: string) =>
  trackAnalyticsEvent('subscription_login_started', {
    provider,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export const trackApiKeyAdded = (provider: string, workspacePath?: string) =>
  trackAnalyticsEvent('api_key_added', {
    provider,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export const trackProviderDisconnected = (provider: string, workspacePath?: string) =>
  trackAnalyticsEvent('provider_disconnected', {
    provider,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export const trackWorkspaceChanged = (source: 'switcher' | 'dialog', workspacePath?: string) =>
  trackAnalyticsEvent('workspace_changed', {
    source,
    ...workspaceAnalyticsProperties(workspacePath)
  });

export interface PromptSentParams {
  ok: boolean;
  source: 'chat' | 'tab';
  queued: boolean;
  prompt: string;
  sessionId?: string;
  attachments: Attachments;
}

export const trackPromptSent = (
  chat: ChatService,
  { ok, source, queued, prompt, sessionId, attachments }: PromptSentParams
) =>
  trackWithChatStatus(chat, 'prompt_sent', {
    ok,
    source,
    queued,
    prompt_length: prompt.length,
    ...attachmentProperties(attachments),
    ...(sessionId ? sessionAnalyticsProperties(sessionId) : {})
  });

export interface CommandSentParams {
  ok: boolean;
  command: string;
  exitCode?: number;
  hasOutput: boolean;
  sessionId?: string;
  excludeFromContext: boolean;
}

export const trackCommandSent = (
  chat: ChatService,
  { ok, command, exitCode, hasOutput, sessionId, excludeFromContext }: CommandSentParams
) =>
  trackWithChatStatus(chat, 'command_sent', {
    ok,
    command_length: command.length,
    has_output: hasOutput,
    exclude_from_context: excludeFromContext,
    ...(typeof exitCode === 'number' ? { exit_code: exitCode } : {}),
    ...(sessionId ? sessionAnalyticsProperties(sessionId) : {})
  });

export interface ModelSelectedParams {
  ok: boolean;
  modelKey: string;
  sessionId?: string;
  workspacePath?: string;
  thinkingLevel?: string;
}

export const trackModelSelected = ({ ok, modelKey, sessionId, workspacePath, thinkingLevel }: ModelSelectedParams) =>
  trackAnalyticsEvent('model_selected', {
    ok,
    ...modelAnalyticsProperties(modelKey),
    ...sessionAnalyticsProperties(sessionId),
    ...workspaceAnalyticsProperties(workspacePath),
    ...(thinkingLevel ? { thinking_level: thinkingLevel } : {})
  });

export interface ThinkingLevelSelectedParams {
  ok: boolean;
  level: string;
  modelKey?: string;
  sessionId?: string;
  workspacePath?: string;
}

export const trackThinkingLevelSelected = ({
  ok,
  level,
  modelKey,
  sessionId,
  workspacePath
}: ThinkingLevelSelectedParams) =>
  trackAnalyticsEvent('thinking_level_selected', {
    ok,
    level,
    ...modelAnalyticsProperties(modelKey),
    ...sessionAnalyticsProperties(sessionId),
    ...workspaceAnalyticsProperties(workspacePath)
  });
