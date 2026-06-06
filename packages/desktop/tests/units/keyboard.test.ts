import { describe, expect, it } from 'vitest';
import { isCloseWindowInput } from '@main/utils/keyboard';

describe('isCloseWindowInput', () => {
  it('accepts control w keydown', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', control: true })).toBe(true);
  });

  it('accepts command w keydown', () => {
    expect(isCloseWindowInput({ key: 'W', type: 'keyDown', meta: true })).toBe(true);
  });

  it('accepts key codes', () => {
    expect(isCloseWindowInput({ code: 'KeyW', type: 'keyDown', control: true })).toBe(true);
  });

  it('rejects modified shortcuts', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', alt: true, control: true })).toBe(false);
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown', shift: true, control: true })).toBe(false);
  });

  it('rejects non-close input', () => {
    expect(isCloseWindowInput({ key: 'w', type: 'keyUp', control: true })).toBe(false);
    expect(isCloseWindowInput({ key: 'n', type: 'keyDown', control: true })).toBe(false);
    expect(isCloseWindowInput({ key: 'w', type: 'keyDown' })).toBe(false);
  });
});
