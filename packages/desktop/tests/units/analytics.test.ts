import { afterEach, describe, expect, it, vi } from 'vitest';

interface MockPostHogOptions {
  host: string;
  flushAt: number;
  isServer: boolean;
  disableGeoip: boolean;
  flushInterval: number;
}

interface CapturedEvent {
  event: string;
  distinctId: string;
  disableGeoip: boolean;
  properties: Record<string, unknown>;
}

interface MockPostHogInstance {
  key: string;
  options: MockPostHogOptions;
  capture: ReturnType<typeof vi.fn>;
  identify: ReturnType<typeof vi.fn>;
  shutdown: ReturnType<typeof vi.fn>;
}

describe('analytics', () => {
  afterEach(() => {
    vi.doUnmock('electron');
    vi.doUnmock('@main/device');
    vi.doUnmock('posthog-node');
    vi.resetModules();
  });

  it('initializes PostHog as a private desktop client', async () => {
    const instances: MockPostHogInstance[] = [];

    vi.doMock('electron', () => {
      const app = {
        isPackaged: true,
        getLocale: () => 'en-US',
        getVersion: () => '1.2.3'
      };
      return { default: { app }, app };
    });
    vi.doMock('@main/device', () => ({ loadDesktopId: () => 'desktop-1' }));
    vi.doMock('posthog-node', () => ({
      PostHog: class implements MockPostHogInstance {
        capture = vi.fn();
        identify = vi.fn();
        shutdown = vi.fn();

        constructor(
          readonly key: string,
          readonly options: MockPostHogOptions
        ) {
          instances.push(this);
        }
      }
    }));

    const { initAnalytics, trackAnalyticsEvent } = await import('@main/analytics/index');

    initAnalytics();
    trackAnalyticsEvent('app_opened');

    const instance = instances[0];
    expect(instance?.options).toMatchObject({ isServer: false, disableGeoip: true });
    expect(instance?.identify).not.toHaveBeenCalled();

    const event = instance?.capture.mock.calls[0]?.[0] as CapturedEvent | undefined;
    expect(event).toMatchObject({ event: 'app_opened', distinctId: 'desktop-1', disableGeoip: true });
    expect(event?.properties).toMatchObject({
      $app_version: '1.2.3',
      $device_type: 'Desktop',
      app_version: '1.2.3',
      platform: process.platform
    });
    expect(event?.properties).not.toHaveProperty('username');
  });
});
