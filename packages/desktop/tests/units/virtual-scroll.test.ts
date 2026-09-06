import { syncScrollEnd } from '@renderer/ui/virtual/utils/scroll';
import { describe, expect, it } from 'vitest';

const scrollElement = (height: number, top: number) => {
  let scrollTop = top;
  return {
    clientHeight: 200,
    scrollHeight: height,
    get scrollTop() {
      return Math.min(scrollTop, Math.max(0, this.scrollHeight - this.clientHeight));
    },
    set scrollTop(value: number) {
      scrollTop = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight));
    }
  } as HTMLElement;
};

describe('virtual bottom anchoring', () => {
  it('keeps the bottom after estimated rows shrink and Chromium clamps the scroll position', () => {
    const element = scrollElement(2000, 1800);
    Object.defineProperty(element, 'scrollHeight', { value: 1300 });
    expect(element.scrollTop).toBe(1100);

    expect(syncScrollEnd(element, true, -700, 24)).toBe(true);
    expect(element.scrollTop).toBe(1100);
  });

  it('keeps the bottom as later measurements shrink the remaining spacers', () => {
    const element = scrollElement(2000, 1800);
    for (const height of [1600, 900, 500]) {
      Object.defineProperty(element, 'scrollHeight', { value: height });
      syncScrollEnd(element, true, -400, 24);
      expect(element.scrollTop).toBe(height - element.clientHeight);
    }
  });

  it('pins to the actual bottom when rows grow beyond their estimates', () => {
    const element = scrollElement(2000, 800);

    expect(syncScrollEnd(element, true, 300, 24)).toBe(true);
    expect(element.scrollTop).toBe(1800);
  });

  it('preserves a near-bottom viewport displaced by growth before its scroll event', () => {
    const element = scrollElement(1500, 980);

    expect(syncScrollEnd(element, false, 300, 24)).toBe(true);
    expect(element.scrollTop).toBe(1300);
  });

  it('does not pull a reader to the bottom after manual scrolling', () => {
    const element = scrollElement(2000, 400);

    for (const delta of [-700, 0, 300]) {
      expect(syncScrollEnd(element, false, delta, 24)).toBe(false);
      expect(element.scrollTop).toBe(400);
    }
  });

  it('handles content shorter than the viewport', () => {
    const element = scrollElement(100, 0);

    expect(syncScrollEnd(element, true, -700, 24)).toBe(true);
    expect(element.scrollTop).toBe(0);
  });
});
