import { composerIsLayered } from '@renderer/shared/composer/layout';

describe('composer layout', () => {
  it('keeps the floating composer single-line when images are attached', () => {
    expect(composerIsLayered({ multiline: false, singleLine: true, hasAttachments: true })).toBe(false);
  });

  it('layers the docked composer for attachments or multiline drafts', () => {
    expect(composerIsLayered({ multiline: false, singleLine: false, hasAttachments: true })).toBe(true);
    expect(composerIsLayered({ multiline: true, singleLine: false, hasAttachments: false })).toBe(true);
  });

  it('keeps the docked composer flat when empty and single-line', () => {
    expect(composerIsLayered({ multiline: false, singleLine: false, hasAttachments: false })).toBe(false);
  });

  it('never layers single-line composer variants', () => {
    expect(composerIsLayered({ multiline: true, singleLine: true, hasAttachments: true })).toBe(false);
  });
});
