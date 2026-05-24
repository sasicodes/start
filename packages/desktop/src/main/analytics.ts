import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { appVersion } from '@main/application';
import { startDir } from '@main/storage';
import { ipcMain } from 'electron';
import { PostHog } from 'posthog-node';

const posthogApiKey = 'phc_uo85J7tZZoW5W2PwmwpzP3HbA59atAmqTGJKAuE2Dg6v';
const posthogHost = 'https://us.i.posthog.com';
const usernameCacheName = 'analytics-username';

const analyticsEvents = [
  'api_key_added',
  'app_opened',
  'command_sent',
  'composer_submitted',
  'model_selected',
  'prompt_sent',
  'quick_access_toggled',
  'session_created',
  'shortcut_changed',
  'subscription_login_started',
  'thinking_level_selected',
  'update_installed',
  'workspace_changed'
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];

type AnalyticsPropertyValue = boolean | number | string | null;

type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

let client: PostHog | null = null;
let distinctId = '';
let identifiedUsername: string | undefined;

const analyticsEventSet = new Set<string>(analyticsEvents);

const cleanString = (value: unknown) => {
  if (typeof value !== 'string') return;

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const readText = (path: string) => cleanString(readFileSync(path, 'utf8'));

const writeText = (path: string, value: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
};

const analyticsPath = (name: string) => join(startDir(), name);

const readCachedUsername = () => {
  try {
    return readText(analyticsPath(usernameCacheName));
  } catch {
    return;
  }
};

const writeCachedUsername = (username: string) => {
  try {
    writeText(analyticsPath(usernameCacheName), username);
  } catch {
    return;
  }
};

const loadDistinctId = () => {
  const path = analyticsPath('analytics');
  try {
    const current = readText(path);
    if (current) return current;
  } catch {}

  const id = randomUUID();
  try {
    writeText(path, id);
  } catch {}
  return id;
};

const baseProperties = (): AnalyticsProperties => ({
  app_version: appVersion,
  platform: process.platform
});

const sanitizeProperties = (properties?: Record<string, unknown>): AnalyticsProperties => {
  const sanitized: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const analyticsId = (value?: string) => {
  const cleanValue = cleanString(value);
  if (!cleanValue) return;

  return createHash('sha256')
    .update(distinctId || 'start')
    .update('\0')
    .update(cleanValue)
    .digest('hex')
    .slice(0, 20);
};

export const modelAnalyticsProperties = (selectedModelKey?: string): AnalyticsProperties => {
  const cleanModel = cleanString(selectedModelKey);
  if (!cleanModel) return {};

  const separatorIndex = cleanModel.indexOf(':');
  if (separatorIndex === -1) return { model_id: cleanModel };

  const provider = cleanString(cleanModel.slice(0, separatorIndex));
  const modelId = cleanString(cleanModel.slice(separatorIndex + 1));
  return {
    ...(modelId ? { model_id: modelId } : {}),
    ...(provider ? { provider } : {})
  };
};

export const sessionAnalyticsProperties = (sessionId?: string): AnalyticsProperties => {
  const sessionAnalyticsId = analyticsId(sessionId);
  return {
    has_session: Boolean(sessionId),
    ...(sessionAnalyticsId ? { session_id: sessionAnalyticsId } : {})
  };
};

export const workspaceAnalyticsProperties = (workspacePath?: string): AnalyticsProperties => {
  const workspaceId = analyticsId(workspacePath);
  return {
    has_workspace: Boolean(workspacePath),
    ...(workspaceId ? { workspace_id: workspaceId } : {})
  };
};

const runCommand = (command: string, args: string[]) =>
  new Promise<string | undefined>((resolve) => {
    execFile(command, args, { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve(undefined);
        return;
      }
      resolve(cleanString(stdout));
    });
  });

const readGithubUsername = async () => {
  const login = await runCommand('gh', ['api', 'user', '--jq', '.login']);
  return login ? `gh:${login}` : undefined;
};

const readGitlabUsername = async () => {
  const username = await runCommand('glab', ['api', 'user', '--jq', '.username']);
  return username ? `gl:${username}` : undefined;
};

const readGitUsername = async () => {
  const username = await runCommand('git', ['config', '--global', 'user.name']);
  return username ? `git:${username}` : undefined;
};

const readDeviceUsername = async () =>
  (await readGithubUsername()) ?? (await readGitlabUsername()) ?? (await readGitUsername());

export const isAnalyticsEvent = (event: string): event is AnalyticsEvent => analyticsEventSet.has(event);

export const initAnalytics = (enabled: boolean) => {
  if (!enabled || client) return;

  distinctId = loadDistinctId();
  identifiedUsername = readCachedUsername();
  client = new PostHog(posthogApiKey, {
    flushAt: 10,
    flushInterval: 5000,
    host: posthogHost
  });
  void identifyDeviceUser();
};

export const identifyDeviceUser = async () => {
  if (!client || !distinctId) return;

  const username = await readDeviceUsername();
  if (!username || identifiedUsername === username) return;

  identifiedUsername = username;
  writeCachedUsername(username);
  client.identify({
    distinctId,
    properties: {
      ...baseProperties(),
      username
    }
  });
};

export const trackAnalyticsEvent = (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
  if (!client || !distinctId) return;

  client.capture({
    distinctId,
    event,
    properties: {
      ...baseProperties(),
      ...sanitizeProperties(properties)
    }
  });
};

export const registerAnalyticsIpc = () => {
  ipcMain.handle('analytics:track', (_event, name: string, properties?: Record<string, unknown>) => {
    if (!isAnalyticsEvent(name)) return;

    trackAnalyticsEvent(name, properties);
  });
};

export const shutdownAnalytics = async () => {
  const analytics = client;
  client = null;
  if (!analytics) return;

  await analytics.shutdown(2000);
};
