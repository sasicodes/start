import {
  composerTextareaHeight,
  composerTextareaLineHeight,
  initialComposerTextareaLayoutState,
  nextComposerTextareaLayoutState,
  shouldUseComposerMultiline
} from '@renderer/shared/composer/textarea';

describe('composer textarea', () => {
  it('caps textarea height to the composer maximum', () => {
    expect(composerTextareaHeight({ lineHeight: 24, scrollHeight: 300 })).toBe(102);
    expect(composerTextareaHeight({ lineHeight: 24, scrollHeight: 52 })).toBe(52);
  });

  it('falls back when computed line height is not numeric', () => {
    expect(composerTextareaLineHeight('normal')).toBe(24);
    expect(composerTextareaLineHeight('18.5px')).toBe(18.5);
  });

  it('keeps the multiline layout when expanded width makes boundary text look single-line', () => {
    const compactLayout = nextComposerTextareaLayoutState({
      lineHeight: 24,
      renderedWidth: 360,
      compactScrollHeight: 52,
      state: initialComposerTextareaLayoutState(),
      value: 'this prompt wrapped in the compact composer row'
    });

    expect(compactLayout).toEqual({ multiline: true, compactWidth: 360 });
    expect(
      nextComposerTextareaLayoutState({
        lineHeight: 24,
        renderedWidth: 520,
        state: compactLayout,
        compactScrollHeight: 52,
        value: 'this prompt wrapped in the compact composer row plus one more letter'
      })
    ).toEqual({ multiline: true, compactWidth: 360 });
  });

  it('returns to single-line layout only when text fits the compact composer row', () => {
    expect(
      shouldUseComposerMultiline({
        lineHeight: 24,
        compactScrollHeight: 28,
        value: 'short prompt'
      })
    ).toBe(false);
  });

  it('keeps explicit line breaks multiline and empty text single-line', () => {
    expect(
      shouldUseComposerMultiline({
        lineHeight: 24,
        compactScrollHeight: 52,
        value: 'line one\nline two'
      })
    ).toBe(true);
    expect(shouldUseComposerMultiline({ lineHeight: 24, value: '   ', compactScrollHeight: 52 })).toBe(false);
  });
});
