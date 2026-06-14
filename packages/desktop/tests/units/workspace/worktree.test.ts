import {
  isManagedWorktree,
  managedWorktreeRoot,
  repoKey,
  worktreeBranch,
  worktreePathFor,
  worktreeSlug
} from '@main/workspace/worktree';
import { describe, expect, it } from 'vitest';

describe('worktreeSlug', () => {
  it('kebab-cases names and trims separators', () => {
    expect(worktreeSlug('  Fix the Bug! ')).toBe('fix-the-bug');
  });

  it('falls back to "session" when nothing usable remains', () => {
    expect(worktreeSlug('   ***   ')).toBe('session');
  });

  it('caps length at 48 characters', () => {
    expect(worktreeSlug('a'.repeat(80)).length).toBe(48);
  });
});

describe('worktreeBranch', () => {
  it('namespaces the slug under start/', () => {
    expect(worktreeBranch('fix-the-bug')).toBe('start/fix-the-bug');
  });
});

describe('repoKey', () => {
  it('is stable for the same root and differs across roots', () => {
    expect(repoKey('/a/repo')).toBe(repoKey('/a/repo'));
    expect(repoKey('/a/repo')).not.toBe(repoKey('/b/repo'));
  });
});

describe('worktreePathFor', () => {
  it('nests slugs under the managed root keyed by repo', () => {
    const key = repoKey('/a/repo');
    expect(worktreePathFor('/data', '/a/repo', 'feature')).toBe(`${managedWorktreeRoot('/data')}/${key}/feature`);
  });
});

describe('isManagedWorktree', () => {
  it('accepts paths inside the managed root', () => {
    expect(isManagedWorktree('/data', worktreePathFor('/data', '/a/repo', 'feature'))).toBe(true);
  });

  it('rejects the root itself and outside paths', () => {
    expect(isManagedWorktree('/data', managedWorktreeRoot('/data'))).toBe(false);
    expect(isManagedWorktree('/data', '/somewhere/else')).toBe(false);
  });
});
