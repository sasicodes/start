import { newSessionMention } from '@renderer/shared/input';
import { describe, expect, it } from 'vitest';

describe('newSessionMention', () => {
  it('preserves the mention in the original prompt', () => {
    expect(newSessionMention('@New Session fix the login bug')).toEqual({ prompt: '@New Session fix the login bug' });
  });

  it('preserves mentions and whitespace anywhere in the draft', () => {
    const draft = '  fix the login bug\n\n@New Session  @Goal keep @src/file.ts intact  ';
    expect(newSessionMention(draft)).toEqual({ prompt: draft });
  });

  it('matches case-insensitively', () => {
    expect(newSessionMention('@new session run the tests')).toEqual({ prompt: '@new session run the tests' });
  });

  it('returns undefined when the mention is absent', () => {
    expect(newSessionMention('open a new session please')).toBeUndefined();
    expect(newSessionMention('@Browser open example.com')).toBeUndefined();
  });

  it('reports an empty prompt when only the mention is present', () => {
    expect(newSessionMention('@New Session')).toEqual({ prompt: '' });
    expect(newSessionMention('  @New Session  ')).toEqual({ prompt: '' });
    expect(newSessionMention('@New Session\n@new session')).toEqual({ prompt: '' });
  });
});

it.each(['Explain this:\n```\n@New Session hello\n```', 'Example `` @New Session hello ``'])(
  'does not route quoted examples into a new session: %s',
  (draft) => {
    expect(newSessionMention(draft)).toBeUndefined();
  }
);
