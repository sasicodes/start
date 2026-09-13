import { browserKey } from '@main/browser/keys';
import { describe, expect, it } from 'vitest';

describe('browserKey', () => {
  it('maps a supported key to a CDP key event', () => {
    expect(browserKey('Enter')).toEqual({ key: 'Enter', code: 'Enter', text: '\r', keyCode: 13, modifiers: 0 });
    expect(browserKey('ArrowDown')).toEqual({
      key: 'ArrowDown',
      code: 'ArrowDown',
      text: '',
      keyCode: 40,
      modifiers: 0
    });
  });

  it('accepts modifier combinations in any case', () => {
    expect(browserKey('cmd+Enter')?.modifiers).toBe(4);
    expect(browserKey('CTRL+enter')?.modifiers).toBe(2);
    expect(browserKey('shift + Tab')?.modifiers).toBe(8);
    expect(browserKey('ctrl+shift+Home')?.modifiers).toBe(10);
  });

  it('rejects unknown keys and modifiers', () => {
    expect(browserKey('F5')).toBeNull();
    expect(browserKey('hyper+Enter')).toBeNull();
    expect(browserKey('')).toBeNull();
  });
});
