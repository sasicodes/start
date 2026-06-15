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

export const repoFolderName = (repoRoot: string) =>
  `${worktreeSlug(path.basename(repoRoot))}-${repoKey(repoRoot).slice(0, 8)}`;

export const managedWorktreeRoot = (baseDir: string) => path.join(baseDir, 'worktrees');

export const worktreePathFor = (baseDir: string, repoRoot: string, slug: string) =>
  path.join(managedWorktreeRoot(baseDir), repoFolderName(repoRoot), slug);

export const isManagedWorktree = (baseDir: string, candidate: string) => {
  const relative = relativeInside(managedWorktreeRoot(baseDir), candidate);
  return relative !== null && relative !== '';
};
