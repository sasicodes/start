import type { ProviderKey } from '@main/types';
import { fetchProviderUsage } from '@main/usage/providers';
import type { ProviderUsage, ProviderUsageCredential } from '@main/usage/types';
import { logger } from '@main/utils/logger';

const refreshIntervalMs = 5 * 60 * 1000;
const providers: ProviderKey[] = ['openai', 'anthropic'];

interface ProviderUsageServiceOptions {
  onChange: () => void;
  prepareCredentials: () => void;
  getCredential: (provider: ProviderKey) => Promise<ProviderUsageCredential | null>;
}

export class ProviderUsageService {
  private lastUsage = '[]';
  private lastRefreshAt = 0;
  private refreshPromise: Promise<void> | null = null;
  private usage = new Map<ProviderKey, ProviderUsage>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: ProviderUsageServiceOptions) {}

  start(): void {
    if (this.timer) return;
    this.refresh().catch(() => {});
    this.timer = setInterval(() => this.refresh().catch(() => {}), refreshIntervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  refresh(): Promise<void> {
    this.refreshPromise ??= this.refreshProviders().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async refreshIfStale(): Promise<void> {
    if (Date.now() - this.lastRefreshAt < refreshIntervalMs) return;
    await this.refresh();
  }

  getUsage(): ProviderUsage[] {
    return providers.flatMap((provider) => {
      const usage = this.usage.get(provider);
      return usage ? [usage] : [];
    });
  }

  private async refreshProviders(): Promise<void> {
    this.lastRefreshAt = Date.now();
    this.options.prepareCredentials();
    await Promise.all(
      providers.map(async (provider) => {
        try {
          const credential = await this.options.getCredential(provider);
          if (!credential) {
            this.usage.delete(provider);
            return;
          }

          this.usage.set(provider, await fetchProviderUsage(provider, credential));
        } catch (error) {
          this.usage.delete(provider);
          logger.error(`${provider} usage`, error);
        }
      })
    );

    this.emitChange();
  }

  private emitChange(): void {
    const serialized = JSON.stringify(this.getUsage());
    if (serialized === this.lastUsage) return;
    this.lastUsage = serialized;
    this.options.onChange();
  }
}
