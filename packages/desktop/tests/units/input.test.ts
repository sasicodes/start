import { newSessionMention } from '@renderer/shared/input';
import { describe, expect, it } from 'vitest';

describe('newSessionMention', () => {
  it('strips the mention and returns the remaining prompt', () => {
    expect(newSessionMention('@New Session fix the login bug')).toEqual({ prompt: 'fix the login bug' });
  });

  it('removes the mention from anywhere in the draft and collapses whitespace', () => {
    expect(newSessionMention('fix the login bug @New Session')).toEqual({ prompt: 'fix the login bug' });
  });

  it('matches case-insensitively', () => {
    expect(newSessionMention('@new session run the tests')).toEqual({ prompt: 'run the tests' });
  });

  it('returns undefined when the mention is absent', () => {
    expect(newSessionMention('open a new session please')).toBeUndefined();
    expect(newSessionMention('@Browser open example.com')).toBeUndefined();
  });
});
