import { runInNewContext } from 'node:vm';
import { browserElementsScript } from '@main/browser/elements';
import { describe, expect, it } from 'vitest';

interface ElementStub {
  name: string;
  isConnected: boolean;
  ownerDocument: object;
  getBoundingClientRect: () => { width: number; height: number };
}

interface ElementRuntime {
  capture: (snapshotId: string) => [string, ElementStub][];
  resolve: (ref: string) => ElementStub | null;
}

const firstRef = (api: ElementRuntime, snapshotId: string) => {
  const [first] = api.capture(snapshotId);
  if (!first) throw new Error('Expected a captured element.');
  return first[0];
};

const runtime = () => {
  const elements: ElementStub[] = [];
  const document = { querySelectorAll: () => elements };
  const location = { href: 'https://example.com/' };
  const window = { location, getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) };
  const api = runInNewContext(
    `${browserElementsScript}\n({ capture: captureBrowserElements, resolve: browserElementForRef })`,
    { window, document }
  ) as ElementRuntime;
  const element = (name: string): ElementStub => ({
    name,
    isConnected: true,
    ownerDocument: document,
    getBoundingClientRect: () => ({ width: 100, height: 30 })
  });
  return { api, element, elements, location };
};

describe('browser element identities', () => {
  it('requires a snapshot before resolving references', () => {
    const { api } = runtime();
    expect(api.resolve('e1')).toBeNull();
  });

  it('keeps the captured element when DOM order changes', () => {
    const { api, element, elements } = runtime();
    const save = element('Save');
    elements.push(save);
    const ref = firstRef(api, 'first');
    elements.unshift(element('Delete'));
    expect(api.resolve(ref)).toBe(save);
  });

  it('rejects replaced nodes instead of resolving a new node at the same index', () => {
    const { api, element, elements } = runtime();
    const old = element('Save');
    elements.push(old);
    const ref = firstRef(api, 'first');
    old.isConnected = false;
    elements.splice(0, 1, element('Delete'));
    expect(api.resolve(ref)).toBeNull();
  });

  it('invalidates references from earlier snapshots and other documents', () => {
    const first = runtime();
    first.elements.push(first.element('Save'));
    const ref = firstRef(first.api, 'first');
    first.api.capture('second');
    expect(first.api.resolve(ref)).toBeNull();
    const other = runtime();
    other.elements.push(other.element('Delete'));
    other.api.capture('other');
    expect(other.api.resolve(ref)).toBeNull();
  });

  it('rejects references after same-document navigation', () => {
    const { api, element, elements, location } = runtime();
    elements.push(element('Save'));
    const ref = firstRef(api, 'first');
    location.href = 'https://example.com/other';
    expect(api.resolve(ref)).toBeNull();
  });

  it.each(['hidden', 'adopted'] as const)('rejects a captured element that becomes %s', (change) => {
    const { api, element, elements } = runtime();
    const saved = element('Save');
    elements.push(saved);
    const ref = firstRef(api, 'first');
    if (change === 'hidden') saved.getBoundingClientRect = () => ({ width: 0, height: 0 });
    else saved.ownerDocument = {};
    expect(api.resolve(ref)).toBeNull();
  });

  it('limits the retained snapshot to 120 elements', () => {
    const { api, element, elements } = runtime();
    elements.push(...Array.from({ length: 150 }, (_, index) => element(String(index))));
    expect(api.capture('first')).toHaveLength(120);
    expect(api.resolve('efirst-121')).toBeNull();
  });
});
