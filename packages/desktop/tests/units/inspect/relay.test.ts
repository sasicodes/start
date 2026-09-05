import { parseInspectRelay, resolveInspectRelay, routeInspectRelay } from '@main/browser/inspect/relay';
import { beforeEach, describe, expect, it } from 'vitest';
import { broadcastedEvents, resetBroadcasts } from '../../fakes/window.js';

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

  it.each([
    { event: 'mode-changed', payload: { active: 'false' } },
    { event: 'annotations-sent', payload: { text: { value: 'invalid' } } },
    { event: 'annotations-sent', payload: { text: 42 } },
    { event: 'annotations-sent', payload: null },
    { event: 'unknown', payload: { text: 'invalid' } }
  ])('rejects invalid relay data: %j', (message) => {
    expect(parseInspectRelay(`__startInspect__:${JSON.stringify(message)}`)).toBeNull();
  });

  it('bounds raw messages and annotation text before forwarding to the renderer', () => {
    const annotation = { event: 'annotations-sent', payload: { text: 'x'.repeat(64 * 1024 + 1) } };
    expect(parseInspectRelay(`__startInspect__:${JSON.stringify(annotation)}`)).toBeNull();
    expect(parseInspectRelay(`__startInspect__:${' '.repeat(512 * 1024)}`)).toBeNull();
  });

  it('extracts mode-changed events', () => {
    const parsed = parseInspectRelay('__startInspect__:{"event":"mode-changed","payload":{"active":true}}');
    expect(parsed).toEqual({ event: 'mode-changed', payload: { active: true } });
  });

  it('extracts annotations-sent payload text intact', () => {
    const text = '<viewport>320 × 240 · dark</viewport>\n<url>https://example.com</url>';
    const message = `__startInspect__:${JSON.stringify({ event: 'annotations-sent', payload: { count: 1, text } })}`;
    const parsed = parseInspectRelay(message);
    expect(parsed).toEqual({ event: 'annotations-sent', payload: { text, count: 1 } });
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

describe('routeInspectRelay', () => {
  beforeEach(resetBroadcasts);

  it('preserves the validated active flag, including false', () => {
    routeInspectRelay({ event: 'mode-changed', payload: { active: false } });
    expect(broadcastedEvents()).toEqual([{ channel: 'app:browser-inspect-state', args: [false] }]);
  });

  it('forwards annotation strings and ignores empty text', () => {
    routeInspectRelay({ event: 'annotations-sent', payload: { text: '' } });
    expect(broadcastedEvents()).toEqual([]);
    routeInspectRelay({ event: 'annotations-sent', payload: { text: 'valid annotation' } });
    expect(broadcastedEvents()).toEqual([{ channel: 'app:browser-inspect-sent', args: ['valid annotation'] }]);
  });
});
