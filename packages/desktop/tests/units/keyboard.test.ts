import { isCloseWindowInput } from '@main/utils/keyboard';
import { describe, expect, it } from 'vitest';

describe('isCloseWindowInput', () => {
  it('accepts command w keydown on mac', () => {
    expect(isCloseWindowInput({ key: 'W', type: 'keyDown', meta: true }, true)).toBe(true);
  });

  it('rejects control w keydown on mac', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', control: true }, true)).toBe(false);
  });

  it('accepts control w keydown off mac', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', control: true }, false)).toBe(true);
  });

  it('rejects command w keydown off mac', () => {
    expect(isCloseWindowInput({ key: 'W', type: 'keyDown', meta: true }, false)).toBe(false);
  });

  it('still closes when both modifier bits are reported', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', meta: true, control: true }, true)).toBe(true);
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', meta: true, control: true }, false)).toBe(true);
  });

  it('accepts key codes', () => {
    expect(isCloseWindowInput({ code: 'KeyW', type: 'keyDown', meta: true }, true)).toBe(true);
    expect(isCloseWindowInput({ code: 'KeyW', type: 'keyDown', control: true }, false)).toBe(true);
  });

  it('rejects modified shortcuts', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', alt: true, meta: true }, true)).toBe(false);
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', shift: true, meta: true }, true)).toBe(false);
  });

  it('rejects non-close input', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyUp', meta: true }, true)).toBe(false);
    expect(isCloseWindowInput({ key: 'n', type: 'keyDown', meta: true }, true)).toBe(false);
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown' }, true)).toBe(false);
  });
});
