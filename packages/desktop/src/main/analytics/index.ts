import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { release } from 'node:os';
import { dirname, join } from 'node:path';
import { appVersion, isProd } from '@main/application';
import electron from 'electron';
import {
  POSTHOG_HOST,
  ANALYTICS_FLUSH_AT,
  POSTHOG_PROJECT_KEY,
  ANALYTICS_HASH_LENGTH,
  ANALYTICS_STORAGE_NAME,
  ANALYTICS_FLUSH_INTERVAL_MS,
  ANALYTICS_COMMAND_TIMEOUT_MS,
  ANALYTICS_SHUTDOWN_TIMEOUT_MS,
  ANALYTICS_USERNAME_STORAGE_NAME,
  ANALYTICS_LAUNCH_STATS_STORAGE_NAME
} from '@main/constants';
import { startDir } from '@main/storage';
import { PostHog } from 'posthog-node';

type AnalyticsPropertyValue = null | number | string | boolean;

type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

const ANALYTICS_EVENTS = [
  'app_opened',
  'app_closed',
  'prompt_sent',
  'command_sent',
  'api_key_added',
  'model_selected',
  'session_created',
  'shortcut_changed',
  'update_installed',
  'workspace_changed',
  'composer_submitted',
  'quick_access_toggled',
  'provider_disconnected',
  'thinking_level_selected',
  'subscription_login_started'
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const { app } = electron;

let distinctId = '';
let launchId = '';
let launchStartMs = 0;
let launchCount = 0;
let firstLaunchAt = '';
let lastLaunchAt = '';
let client: PostHog | null = null;
let identifiedUsername: string | undefined;

const safeLocale = () => {
  try {
    return app.getLocale() || undefined;
  } catch {
    return;
  }
};

const isAnalyticsPropertyValue = (value: unknown): value is AnalyticsPropertyValue => {
  const isNull = value === null;
  const isString = typeof value === 'string';
  const isNumber = typeof value === 'number';
  const isBoolean = typeof value === 'boolean';
  return isNull || isString || isNumber || isBoolean;
};

const readText = (path: string) => {
  const text = readFileSync(path, 'utf8').trim();
  return text ? text : undefined;
};

const writeText = (path: string, value: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
};

const analyticsPath = (name: string) => join(startDir(), name);

const readAnalyticsValue = (name: string) => {
  try {
    return readText(analyticsPath(name));
  } catch {
    return;
  }
};

const writeAnalyticsValue = (name: string, value: string) => {
  try {
    writeText(analyticsPath(name), value);
  } catch {
    return;
  }
};

const loadDistinctId = () => {
  const current = readAnalyticsValue(ANALYTICS_STORAGE_NAME);
  if (current) return current;

  const id = randomUUID();
  writeAnalyticsValue(ANALYTICS_STORAGE_NAME, id);
  return id;
};

const readLaunchStats = () => {
  const text = readAnalyticsValue(ANALYTICS_LAUNCH_STATS_STORAGE_NAME);
  if (!text) return;

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return;
    const value = parsed as Record<string, unknown>;
    return {
      count: typeof value.launch_count === 'number' ? value.launch_count : 0,
      first: typeof value.first_launch_at === 'string' ? value.first_launch_at : '',
      last: typeof value.last_launch_at === 'string' ? value.last_launch_at : ''
    };
  } catch {
    return;
  }
};

const bumpLaunchStats = () => {
  const now = new Date().toISOString();
  const previous = readLaunchStats();
  firstLaunchAt = previous?.first || now;
  lastLaunchAt = now;
  launchCount = (previous?.count ?? 0) + 1;
  writeAnalyticsValue(
    ANALYTICS_LAUNCH_STATS_STORAGE_NAME,
    JSON.stringify({
      launch_count: launchCount,
      last_launch_at: lastLaunchAt,
      first_launch_at: firstLaunchAt
    })
  );
};

const baseProperties = (): AnalyticsProperties => ({
  app_version: appVersion,
  platform: process.platform,
  ...(launchId ? { launch_id: launchId } : {})
});

const sanitizeProperties = (properties?: Record<string, unknown>): AnalyticsProperties => {
  const sanitized: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (isAnalyticsPropertyValue(value)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const captureProperties = (properties?: Record<string, unknown>): AnalyticsProperties => ({
  ...baseProperties(),
  ...sanitizeProperties(properties)
});

const identifyProperties = (username: string): AnalyticsProperties => ({
  username,
  ...baseProperties()
});

const analyticsId = (value?: string) => {
  const id = value?.trim();
  if (!id) return;

  const salt = distinctId || 'start';
  const hash = createHash('sha256');
  hash.update(salt);
  hash.update('\0');
  hash.update(id);
  return hash.digest('hex').slice(0, ANALYTICS_HASH_LENGTH);
};

export const modelAnalyticsProperties = (selectedModelId?: string): AnalyticsProperties => {
  const selectedModel = selectedModelId?.trim();
  if (!selectedModel) return {};

  const separatorIndex = selectedModel.indexOf(':');
  if (separatorIndex === -1) return { model_id: selectedModel };

  const provider = selectedModel.slice(0, separatorIndex).trim();
  const modelId = selectedModel.slice(separatorIndex + 1).trim();
  return {
    ...(provider ? { provider } : {}),
    ...(modelId ? { model_id: modelId } : {})
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
    execFile(command, args, { timeout: ANALYTICS_COMMAND_TIMEOUT_MS }, (error, stdout) => {
      if (error) {
        resolve(undefined);
        return;
      }

      const output = stdout.trim();
      resolve(output ? output : undefined);
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

const canInitializeAnalytics = () => isProd;

export const initAnalytics = () => {
  if (!canInitializeAnalytics()) return;
  if (client) return;

  distinctId = loadDistinctId();
  launchId = randomUUID();
  launchStartMs = Date.now();
  bumpLaunchStats();
  identifiedUsername = readAnalyticsValue(ANALYTICS_USERNAME_STORAGE_NAME);
  client = new PostHog(POSTHOG_PROJECT_KEY, {
    host: POSTHOG_HOST,
    flushAt: ANALYTICS_FLUSH_AT,
    flushInterval: ANALYTICS_FLUSH_INTERVAL_MS
  });
  void identifyDeviceUser();
};

export const identifyDeviceUser = async () => {
  const analytics = client;
  if (!analytics) return;
  if (!distinctId) return;

  const username = await readDeviceUsername();
  if (!username) return;

  const isSameUsername = identifiedUsername === username;
  if (isSameUsername) return;

  identifiedUsername = username;
  writeAnalyticsValue(ANALYTICS_USERNAME_STORAGE_NAME, username);
  analytics.identify({
    distinctId,
    disableGeoip: true,
    properties: identifyProperties(username)
  });
};

const launchPersonProperties = () => {
  const locale = safeLocale();
  return {
    $set: {
      arch: process.arch,
      os_version: release(),
      launch_count: launchCount,
      last_launch_at: lastLaunchAt,
      ...(locale ? { locale } : {})
    },
    $set_once: {
      first_launch_at: firstLaunchAt
    }
  };
};

const captureSync = (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
  const analytics = client;
  if (!analytics) return;
  if (!distinctId) return;

  const isAppOpened = event === 'app_opened';
  analytics.capture({
    event,
    distinctId,
    disableGeoip: true,
    properties: {
      ...captureProperties(properties),
      ...(isAppOpened ? launchPersonProperties() : {})
    }
  });
};

export const trackAnalyticsEvent = (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
  setImmediate(() => captureSync(event, properties));
};

export const shutdownAnalytics = async () => {
  const analytics = client;
  if (!analytics) return;

  captureSync('app_closed', { session_duration_ms: Date.now() - launchStartMs });
  client = null;
  await analytics.shutdown(ANALYTICS_SHUTDOWN_TIMEOUT_MS);
};
