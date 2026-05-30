import { appendInspectToDraft } from '@renderer/shared/browser/inspect-draft';
import { describe, expect, it } from 'vitest';

describe('appendInspectToDraft', () => {
  it('returns the block when the draft is empty', () => {
    expect(appendInspectToDraft('', '<inspect>1</inspect>')).toBe('<inspect>1</inspect>');
  });

  it('returns the existing draft when the block is empty', () => {
    expect(appendInspectToDraft('hello', '   ')).toBe('hello');
  });

  it('joins the draft and block with a blank line', () => {
    expect(appendInspectToDraft('explain this:', '<inspect>1</inspect>')).toBe('explain this:\n\n<inspect>1</inspect>');
  });

  it('normalizes any trailing whitespace on the draft to a single blank line', () => {
    expect(appendInspectToDraft('explain this:\n\n\n', '<inspect>1</inspect>')).toBe(
      'explain this:\n\n<inspect>1</inspect>'
    );
  });

  it('preserves nested inspect markup in the block verbatim', () => {
    const block = '<inspect>\n<annotation>nested</annotation>\n</inspect>';
    expect(appendInspectToDraft('', block)).toBe(block);
  });
});
