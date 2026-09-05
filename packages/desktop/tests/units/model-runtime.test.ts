import { InMemoryCredentialStore } from '@earendil-works/pi-ai';
import { expect, it, vi } from 'vitest';

it('loads the installed runtime with fable 5.1 thinking support', async () => {
  const { ModelRuntime } = await vi.importActual<typeof import('@earendil-works/pi-coding-agent')>(
    '@earendil-works/pi-coding-agent'
  );
  const runtime = await ModelRuntime.create({
    modelsPath: null,
    refreshOnCreate: false,
    credentials: new InMemoryCredentialStore()
  });

  expect(runtime.getModel('anthropic', 'claude-fable-5-1')).toMatchObject({
    reasoning: true,
    api: 'anthropic-messages',
    thinkingLevelMap: { off: null, xhigh: 'xhigh' },
    compat: { forceAdaptiveThinking: true, supportsMidConvoEffort: true }
  });
});
