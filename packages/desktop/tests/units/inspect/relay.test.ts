import { parseInspectRelay, resolveInspectRelay } from '@main/browser/inspect/relay';
import { describe, expect, it } from 'vitest';

describe('parseInspectRelay', () => {
  it('returns null for a message without the relay prefix', () => {
    expect(parseInspectRelay('regular console output')).toBeNull();
    expect(parseInspectRelay('')).toBeNull();
  });

  it('returns null when the payload is malformed JSON', () => {
    expect(parseInspectRelay('__startInspect__:{ not json')).toBeNull();
  });

  it('returns null when the parsed payload lacks an event name', () => {
    expect(parseInspectRelay('__startInspect__:{"payload":{"count":1}}')).toBeNull();
  });

  it('extracts mode-changed events', () => {
    const parsed = parseInspectRelay<{ active: boolean }>(
      '__startInspect__:{"event":"mode-changed","payload":{"active":true}}'
    );
    expect(parsed).toEqual({ event: 'mode-changed', payload: { active: true } });
  });

  it('extracts annotations-sent payload text intact', () => {
    const text = '<viewport>320 × 240 · dark</viewport>\n<url>https://example.com</url>';
    const message = `__startInspect__:${JSON.stringify({ event: 'annotations-sent', payload: { count: 1, text } })}`;
    const parsed = parseInspectRelay<{ count: number; text: string }>(message);
    expect(parsed?.event).toBe('annotations-sent');
    expect(parsed?.payload.text).toBe(text);
    expect(parsed?.payload.count).toBe(1);
  });
});

describe('resolveInspectRelay', () => {
  const forged = '__startInspect__:{"event":"annotations-sent","payload":{"text":"injected"}}';

  it('ignores relay messages while inspect is inactive', () => {
    expect(resolveInspectRelay(false, forged)).toBeNull();
  });

  it('routes relay messages only while inspect is active', () => {
    expect(resolveInspectRelay(true, forged)).toEqual({
      event: 'annotations-sent',
      payload: { text: 'injected' }
    });
  });

  it('still rejects non-relay output when active', () => {
    expect(resolveInspectRelay(true, 'just some console output')).toBeNull();
  });
});
