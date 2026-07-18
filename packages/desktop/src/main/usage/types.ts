import type { ProviderUsage as PublicProviderUsage } from '@preload/index';

export type ProviderUsage = PublicProviderUsage;

export interface ProviderUsageCredential {
  token: string;
  accountId?: string;
}
