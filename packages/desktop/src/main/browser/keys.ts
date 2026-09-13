export interface BrowserKey {
  key: string;
  code: string;
  text: string;
  keyCode: number;
  modifiers: number;
}

interface KeyDefinition {
  code: string;
  text: string;
  keyCode: number;
}

const keyDefinitions = new Map<string, KeyDefinition>([
  ['tab', { code: 'Tab', text: '\t', keyCode: 9 }],
  ['end', { code: 'End', text: '', keyCode: 35 }],
  ['home', { code: 'Home', text: '', keyCode: 36 }],
  ['enter', { code: 'Enter', text: '\r', keyCode: 13 }],
  ['space', { code: 'Space', text: ' ', keyCode: 32 }],
  ['delete', { code: 'Delete', text: '', keyCode: 46 }],
  ['escape', { code: 'Escape', text: '', keyCode: 27 }],
  ['pageup', { code: 'PageUp', text: '', keyCode: 33 }],
  ['arrowup', { code: 'ArrowUp', text: '', keyCode: 38 }],
  ['pagedown', { code: 'PageDown', text: '', keyCode: 34 }],
  ['arrowleft', { code: 'ArrowLeft', text: '', keyCode: 37 }],
  ['arrowdown', { code: 'ArrowDown', text: '', keyCode: 40 }],
  ['arrowright', { code: 'ArrowRight', text: '', keyCode: 39 }],
  ['backspace', { code: 'Backspace', text: '', keyCode: 8 }]
]);

const keyNames = new Map<string, string>([
  ['space', ' '],
  ['arrowup', 'ArrowUp'],
  ['arrowdown', 'ArrowDown'],
  ['arrowleft', 'ArrowLeft'],
  ['arrowright', 'ArrowRight']
]);

const modifierBits = new Map<string, number>([
  ['alt', 1],
  ['cmd', 4],
  ['ctrl', 2],
  ['meta', 4],
  ['shift', 8],
  ['control', 2],
  ['command', 4]
]);

export const browserKey = (value: string): BrowserKey | null => {
  const parts = value
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const name = parts.pop() ?? '';
  const definition = keyDefinitions.get(name);
  if (!definition) return null;

  let modifiers = 0;
  for (const part of parts) {
    const bit = modifierBits.get(part);
    if (!bit) return null;
    modifiers |= bit;
  }

  return {
    modifiers,
    code: definition.code,
    text: definition.text,
    keyCode: definition.keyCode,
    key: keyNames.get(name) ?? definition.code
  };
};
