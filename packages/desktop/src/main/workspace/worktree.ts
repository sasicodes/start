import { createHash } from 'node:crypto';
import path from 'node:path';
import { relativeInside } from '@main/search/path';

export const worktreeSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'session';

export const worktreeBranch = (slug: string) => `start/${slug}`;

export const repoKey = (repoRoot: string) => createHash('sha256').update(repoRoot).digest('hex').slice(0, 12);

export const managedWorktreeRoot = (userDataDir: string) => path.join(userDataDir, 'worktrees');

export const worktreePathFor = (userDataDir: string, repoRoot: string, slug: string) =>
  path.join(managedWorktreeRoot(userDataDir), repoKey(repoRoot), slug);

export const isManagedWorktree = (userDataDir: string, candidate: string) => {
  const relative = relativeInside(managedWorktreeRoot(userDataDir), candidate);
  return relative !== null && relative !== '';
};
