import { formatDuration, formatRelativeTime } from '@renderer/utils/time';
import { describe, expect, it, vi } from 'vitest';

describe('time formatters', () => {
  it('formats short durations down to the second', () => {
    expect(formatDuration(0)).toBe('<1s');
    expect(formatDuration(400)).toBe('<1s');
    expect(formatDuration(45 * 1000)).toBe('45s');
  });

  it('formats minutes with optional seconds', () => {
    expect(formatDuration(2 * 60 * 1000)).toBe('2m');
    expect(formatDuration(125 * 1000)).toBe('2m 5s');
  });

  it('formats hours with optional minutes', () => {
    expect(formatDuration(60 * 60 * 1000)).toBe('1h');
    expect(formatDuration(90 * 60 * 1000)).toBe('1h 30m');
  });

  it('reports relative time across minutes, hours, days, months and years', () => {
    const now = new Date('2026-05-24T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5m ago');
    expect(formatRelativeTime(now - 90 * 60 * 1000)).toBe('2h ago');
    expect(formatRelativeTime(now - 5 * 24 * 60 * 60 * 1000)).toBe('5 days ago');
    expect(formatRelativeTime(now - 60 * 24 * 60 * 60 * 1000)).toBe('2 months ago');
    expect(formatRelativeTime(now - 400 * 24 * 60 * 60 * 1000)).toBe('1 year ago');
  });
});
