import { shouldFreezeRoom, shouldSyncRoomScroll } from '@renderer/shared/turn/room';
import { describe, expect, it } from 'vitest';

describe('shouldFreezeRoom', () => {
  it('freezes when streaming ends with an aligned room turn', () => {
    expect(shouldFreezeRoom(true, false, true, false)).toBe(true);
  });

  it('does not freeze while the response is still streaming', () => {
    expect(shouldFreezeRoom(true, true, true, false)).toBe(false);
  });

  it('does not freeze when streaming starts', () => {
    expect(shouldFreezeRoom(false, true, true, false)).toBe(false);
  });

  it('does not freeze on mount without a streaming transition', () => {
    expect(shouldFreezeRoom(false, false, true, false)).toBe(false);
  });

  it('does not freeze when no room turn is anchored', () => {
    expect(shouldFreezeRoom(true, false, false, false)).toBe(false);
    expect(shouldFreezeRoom(true, false, false, true)).toBe(false);
  });

  it('does not freeze while the initial alignment is still pending', () => {
    expect(shouldFreezeRoom(true, false, true, true)).toBe(false);
  });
});

describe('shouldSyncRoomScroll', () => {
  it('scrolls for explicit alignment requests', () => {
    expect(shouldSyncRoomScroll(false, true, false)).toBe(true);
  });

  it('scrolls while the initial alignment is pending', () => {
    expect(shouldSyncRoomScroll(false, false, true)).toBe(true);
  });

  it('does not scroll during passive height maintenance', () => {
    expect(shouldSyncRoomScroll(false, false, false)).toBe(false);
  });

  it('never scrolls once frozen', () => {
    expect(shouldSyncRoomScroll(true, true, false)).toBe(false);
    expect(shouldSyncRoomScroll(true, false, true)).toBe(false);
    expect(shouldSyncRoomScroll(true, true, true)).toBe(false);
  });
});
