import { type FakeModel, getAvailableModels, getModelRegistryError } from './state.js';

export class FakeAuthStorage {
  static create() {
    return new FakeAuthStorage();
  }

  static fromStorage(_backend: unknown) {
    return new FakeAuthStorage();
  }

  reload() {}

  setRuntimeApiKey(_provider: string, _apiKey: string) {}

  get(_provider: string): { type: 'oauth' | 'api_key' } | undefined {
    return;
  }

  getAuthStatus(_provider: string): { configured: boolean } {
    return { configured: false };
  }

  async login(_provider: string, _callbacks: unknown): Promise<void> {}
}

export class FakeModelRegistry {
  static create(_authStorage: FakeAuthStorage) {
    return new FakeModelRegistry();
  }

  refresh() {}

  getAvailable(): FakeModel[] {
    return getAvailableModels();
  }

  getError(): string | undefined {
    return getModelRegistryError();
  }
}

export const FakeSettingsManager = {
  fromStorage(_storage: unknown) {
    return {};
  }
};
