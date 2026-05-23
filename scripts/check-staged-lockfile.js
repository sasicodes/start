import { execFileSync } from 'node:child_process';

const allowedValues = new Set(['1', 'true', 'yes']);
const isAllowed = (value) => allowedValues.has((value ?? '').toLowerCase());

const readStagedLockfiles = () => {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--', 'pnpm-lock.yaml'], {
      encoding: 'utf8'
    }).trim();
  } catch {
    return '';
  }
};

const stagedLockfiles = isAllowed(process.env.ALLOW_LOCKFILE_CHANGE) ? '' : readStagedLockfiles();

if (stagedLockfiles) {
  process.stderr.write(
    'pnpm-lock.yaml is staged. Review dependency changes, then commit with ALLOW_LOCKFILE_CHANGE=1 if this lockfile update is intentional.\n'
  );
  process.exit(1);
}
