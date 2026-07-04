import { shouldFreezeRoom } from '@renderer/shared/turn/room';
import { describe, expect, it } from 'vitest';

describe('shouldFreezeRoom', () => {
  it('freezes once a streamed response finishes while a room is anchored', () => {
    expect(shouldFreezeRoom(false, true)).toBe(true);
  });

  it('does not freeze while the response is still streaming', () => {
    expect(shouldFreezeRoom(true, true)).toBe(false);
  });

  it('does not freeze when no room turn is anchored', () => {
    expect(shouldFreezeRoom(false, false)).toBe(false);
    expect(shouldFreezeRoom(true, false)).toBe(false);
  });
});
