import type { ProviderAuthStatus } from '@preload/index';

export const saveProviderKey = async (provider: string, key: string): Promise<ProviderAuthStatus[] | null> => {
  try {
    return await window.pi.chat.setApiKey(provider, key);
  } catch {
    return null;
  }
};
