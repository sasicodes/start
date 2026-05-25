import { formatForDisplay } from '@tanstack/hotkeys';

const displayOptions = { platform: 'mac', separatorToken: ' + ', useSymbols: false } as const;
const symbolOptions = { platform: 'mac', useSymbols: true } as const;

export const formatShortcut = (chord: string) => {
  try {
    const display = formatForDisplay(chord, displayOptions);
    const symbol = formatForDisplay(chord, symbolOptions);
    if (display !== symbol) return `${display} (${symbol})`;
    return display;
  } catch {
    return chord;
  }
};
