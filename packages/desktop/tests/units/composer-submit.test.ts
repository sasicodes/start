import {
  composerHasDraft,
  composerShowsStop,
  composerStopping,
  composerSubmitDisabled
} from '@renderer/shared/composer/submit';

describe('composer generate button', () => {
  it('treats whitespace-only drafts as empty', () => {
    expect(composerHasDraft('   ')).toBe(false);
    expect(composerHasDraft(' hi ')).toBe(true);
  });

  it('shows the stop button only while generating without a draft', () => {
    expect(composerShowsStop('', true)).toBe(true);
    expect(composerShowsStop('follow up', true)).toBe(false);
    expect(composerShowsStop('', false)).toBe(false);
  });

  it('keeps the optimistic stopping state only until generation ends', () => {
    expect(composerStopping({ stopping: true, isGenerating: true })).toBe(true);
    expect(composerStopping({ stopping: true, isGenerating: false })).toBe(false);
    expect(composerStopping({ stopping: false, isGenerating: true })).toBe(false);
  });

  it('disables submit for any blocking reason', () => {
    expect(
      composerSubmitDisabled({ draft: 'ready', commandMode: false, isGenerating: false, disabledReason: 'busy' })
    ).toBe(true);
    expect(composerSubmitDisabled({ draft: '   ', commandMode: false, isGenerating: false })).toBe(true);
    expect(composerSubmitDisabled({ draft: 'ready', commandMode: false, isGenerating: false })).toBe(false);
  });

  it('requires a runnable command and idle state in command mode', () => {
    expect(composerSubmitDisabled({ draft: 'ls', commandMode: true, isGenerating: false })).toBe(true);
    expect(composerSubmitDisabled({ draft: '!ls', commandMode: true, isGenerating: true })).toBe(true);
    expect(composerSubmitDisabled({ draft: '!ls', commandMode: true, isGenerating: false })).toBe(false);
  });
});
