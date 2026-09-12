import { composerSpacing } from '@renderer/shared/composer/use-clearance';
import { describe, expect, it } from 'vitest';

describe('composerSpacing', () => {
  it('keeps the existing minimum spacing without attached content', () => {
    expect(composerSpacing(46, 0)).toEqual({ overhang: 0, clearance: 112 });
  });

  it('includes the queue or finder height, allowing for its overlap', () => {
    expect(composerSpacing(46, 216)).toEqual({ overhang: 214, clearance: 294 });
  });

  it('accounts for a multiline input and rounds clearance up', () => {
    expect(composerSpacing(120.5, 80)).toEqual({ overhang: 78, clearance: 233 });
  });

  it('removes the button offset when attached content closes', () => {
    expect(composerSpacing(120, 0)).toEqual({ overhang: 0, clearance: 154 });
  });
});
