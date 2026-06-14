import { estimateTurnHeight } from '@renderer/shared/turn/estimate';
import type { Turn } from '@renderer/utils/types';
import { describe, expect, it } from 'vitest';

const baseTurn: Turn = {
  text: '',
  id: 'turn',
  createdAt: 0,
  role: 'assistant'
};

const turn = (overrides: Partial<Turn>): Turn => ({ ...baseTurn, ...overrides });

describe('estimateTurnHeight', () => {
  it('uses the compact event estimate for event turns', () => {
    expect(estimateTurnHeight(turn({ role: 'event' }))).toBe(24);
  });

  it('grows with estimated assistant text lines', () => {
    expect(estimateTurnHeight(turn({ text: 'x'.repeat(87) }))).toBe(64);
  });

  it('keeps empty terminal turns at the base height', () => {
    expect(estimateTurnHeight(turn({ role: 'terminal' }))).toBe(44);
  });

  it('reserves attachment height for image-only user turns', () => {
    expect(
      estimateTurnHeight(
        turn({
          role: 'user',
          attachments: [
            {
              path: '',
              name: 'image',
              type: 'image',
              id: 'turn:image:0',
              mimeType: 'image/png',
              previewUrl: 'data:image/png;base64,aW1hZ2U='
            }
          ]
        })
      )
    ).toBe(62);
  });

  it('uses activity items instead of double-counting legacy thinking', () => {
    expect(
      estimateTurnHeight(
        turn({
          text: 'short',
          thinking: 'legacy thinking',
          activityItems: [
            {
              createdAt: 0,
              updatedAt: 0,
              id: 'thinking',
              type: 'thinking',
              text: 'current thinking'
            }
          ]
        })
      )
    ).toBe(74);
  });
});
