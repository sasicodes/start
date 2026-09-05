import type { ModelRuntime } from '@earendil-works/pi-coding-agent';

export const configureModelEffort = (runtime: ModelRuntime) => {
  for (const provider of ['openai', 'openai-codex', 'anthropic']) {
    const models = runtime.getModels(provider).map((model) => {
      const highest = model.thinkingLevelMap?.max;
      if (!highest) return model;
      return { ...model, thinkingLevelMap: { ...model.thinkingLevelMap, xhigh: highest } };
    });
    runtime.registerProvider(provider, { models });
  }
};
