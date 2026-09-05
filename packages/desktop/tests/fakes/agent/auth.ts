import { type FakeModel, getAvailableModels, getModelRegistryError } from './state.js';

export class FakeModelRuntime {
  static async create() {
    return new FakeModelRuntime();
  }

  getModels(provider: string): FakeModel[] {
    return getAvailableModels().filter((model) => model.provider === provider);
  }

  registerProvider(_provider: string, _config: unknown) {}

  async refresh() {}

  getAvailableSnapshot(): FakeModel[] {
    return getAvailableModels();
  }

  getError(): string | undefined {
    return getModelRegistryError();
  }

  getProviderAuthStatus(_provider: string): { configured: boolean } {
    return { configured: false };
  }

  async getAuth(_provider: string) {
    return;
  }

  async setRuntimeApiKey(_provider: string, _apiKey: string) {}

  async removeRuntimeApiKey(_provider: string) {}

  async logout(_provider: string) {}

  async login(_provider: string, _type: string, _interaction: unknown) {}
}

export class FakeModelRegistry {
  async refresh() {}

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
