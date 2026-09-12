import { composerClearance } from '@renderer/shared/composer/state';
import { useTurnClearance } from '@renderer/shared/turn/use-clearance';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('preact/hooks', () => ({
  useLayoutEffect: (effect: () => void) => effect()
}));

const viewport = (top: number) => {
  let scrollTop = top;
  const element = {
    clientHeight: 500,
    style: { paddingBottom: '112px' },
    get scrollTop() {
      return scrollTop;
    },
    set scrollTop(value: number) {
      scrollTop = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight));
    },
    get scrollHeight() {
      return 1000 + Number.parseFloat(this.style.paddingBottom);
    }
  };
  return element as unknown as HTMLElement;
};

afterEach(() => {
  composerClearance.value = 112;
});

describe('useTurnClearance', () => {
  it('keeps the latest content visible as a panel opens and closes', () => {
    const element = viewport(612);
    composerClearance.value = 294;
    useTurnClearance({ current: element });
    expect(element.style.paddingBottom).toBe('294px');
    expect(element.scrollTop).toBe(element.scrollHeight - element.clientHeight);

    element.scrollTop = element.scrollHeight - element.clientHeight;
    composerClearance.value = 112;
    useTurnClearance({ current: element });
    expect(element.style.paddingBottom).toBe('112px');
    expect(element.scrollTop).toBe(element.scrollHeight - element.clientHeight);
  });

  it('preserves the reading position when scrolled up', () => {
    const element = viewport(200);
    composerClearance.value = 294;
    useTurnClearance({ current: element });
    expect(element.style.paddingBottom).toBe('294px');
    expect(element.scrollTop).toBe(200);
  });

  it('handles an unmounted feed', () => {
    expect(() => useTurnClearance({ current: null })).not.toThrow();
  });
});
