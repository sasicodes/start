import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const git = async (cwd: string, args: string[]) => {
  const { stdout } = await execFileAsync('git', args, { cwd, timeout: 1200 });
  return stdout.trim();
};

export const getGitBranch = async (cwd: string) => {
  try {
    const insideWorkTree = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
    if (insideWorkTree !== 'true') return undefined;

    const branchName = await git(cwd, ['branch', '--show-current']);
    if (branchName) return branchName;

    const tagName = await git(cwd, ['describe', '--tags', '--exact-match']).catch(() => '');
    if (tagName) return tagName;

    const commit = await git(cwd, ['rev-parse', '--short', 'HEAD']);
    return commit ? `detached ${commit}` : undefined;
  } catch {
    return undefined;
  }
};

export const isGitRepository = async (cwd: string) => {
  try {
    return (await git(cwd, ['rev-parse', '--is-inside-work-tree'])) === 'true';
  } catch {
    return false;
  }
};
