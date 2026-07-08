import { createHash } from 'node:crypto';
import { release } from 'node:os';
import { appVersion, isProd } from '@main/application';
import {
  ANALYTICS_FLUSH_AT,
  ANALYTICS_FLUSH_INTERVAL_MS,
  ANALYTICS_HASH_LENGTH,
  ANALYTICS_SHUTDOWN_TIMEOUT_MS,
  POSTHOG_HOST,
  POSTHOG_PROJECT_KEY
} from '@main/constants';
import { loadDesktopId } from '@main/device';
import electron from 'electron';
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
let launchStartMs = 0;
let client: PostHog | null = null;

const osName = () => {
  if (process.platform === 'darwin') return 'macOS';
  if (process.platform === 'win32') return 'Windows';
  if (process.platform === 'linux') return 'Linux';
  return process.platform;
};

const baseProperties: AnalyticsProperties = {
  $os: osName(),
  platform: process.platform,
  app_version: appVersion,
  $os_version: release(),
  $app_version: appVersion,
  $device_type: 'Desktop'
};

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

export const initAnalytics = () => {
  if (!isProd) return;
  if (client) return;

  distinctId = loadDesktopId();
  launchStartMs = Date.now();
  client = new PostHog(POSTHOG_PROJECT_KEY, {
    host: POSTHOG_HOST,
    flushAt: ANALYTICS_FLUSH_AT,
    isServer: false,
    disableGeoip: true,
    flushInterval: ANALYTICS_FLUSH_INTERVAL_MS
  });
};

const launchPersonProperties = () => {
  const locale = app.getLocale();
  return {
    $set: {
      arch: process.arch,
      os_version: release(),
      ...(locale ? { locale } : {})
    }
  };
};

export const trackAnalyticsEvent = (event: AnalyticsEvent, properties: AnalyticsProperties = {}) => {
  const analytics = client;
  if (!analytics) return;
  if (!distinctId) return;

  analytics.capture({
    event,
    distinctId,
    disableGeoip: true,
    properties: {
      ...baseProperties,
      ...properties,
      ...(event === 'app_opened' ? launchPersonProperties() : {})
    }
  });
};

export const shutdownAnalytics = async () => {
  const analytics = client;
  if (!analytics) return;

  trackAnalyticsEvent('app_closed', { session_duration_ms: Date.now() - launchStartMs });
  client = null;
  await analytics.shutdown(ANALYTICS_SHUTDOWN_TIMEOUT_MS);
};
