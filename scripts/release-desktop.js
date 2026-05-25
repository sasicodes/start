import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const desktopPackagePath = join(workspaceRoot, 'packages', 'desktop', 'package.json');
const semverPattern = /^v?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const run = (command, options = {}) => execSync(command, { encoding: 'utf8', stdio: 'inherit', ...options });
const runCapture = (command, options = {}) => execSync(command, { encoding: 'utf8', ...options }).trim();

const isSemver = (value) => semverPattern.test(value);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const push = args.includes('--push');
  const positional = args.filter((arg) => !arg.startsWith('--'));

  if (positional.length > 1) {
    throw new Error('Only one version argument is supported.');
  }

  return {
    releaseVersion: positional[0] ?? 'patch',
    dryRun,
    push
  };
};

const bumpVersion = (version, releaseVersion) => {
  if (isSemver(releaseVersion)) {
    return releaseVersion.replace(/^v/, '');
  }

  const [, majorText, minorText, patchText] = version.match(semverPattern) ?? [];
  if (!majorText || !minorText || !patchText) {
    throw new Error(`Current version is not semver compatible: ${version}`);
  }

  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);

  switch (releaseVersion) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(
        `Unsupported release target ${releaseVersion}. Use major, minor, patch, or a version like v1.2.3.`
      );
  }
};

const listWorkspaceChanges = () => {
  const status = execSync('git status --short', { cwd: workspaceRoot, encoding: 'utf8' });
  return status
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.slice(3));
};

const ensureWorkingTreeClean = () => {
  const statusLines = listWorkspaceChanges();
  const unexpected = statusLines.filter((path) => path !== 'packages/desktop/package.json');

  if (unexpected.length > 0) {
    throw new Error(
      `Working tree is dirty: ${statusLines.join(', ')}. Keep only desktop package.json changes for this release.`
    );
  }

  if (statusLines.includes('packages/desktop/package.json')) {
    throw new Error(
      'Unexpected pre-existing change in packages/desktop/package.json. Commit or discard it before releasing.'
    );
  }
};

const { releaseVersion, dryRun, push } = parseArgs();
const packageJson = JSON.parse(readFileSync(desktopPackagePath, 'utf8'));
const currentVersion = String(packageJson.version ?? '').trim();

if (!isSemver(currentVersion)) {
  throw new Error(`Invalid desktop package version: ${currentVersion}`);
}

const nextVersion = bumpVersion(currentVersion, releaseVersion);

if (currentVersion === nextVersion) {
  throw new Error(`No version change needed for ${nextVersion}.`);
}

const tag = `v${nextVersion}`;
const existingTag = runCapture(`git tag --list ${tag}`, { cwd: workspaceRoot });
if (existingTag) {
  throw new Error(`Tag ${tag} already exists.`);
}

if (dryRun) {
  process.stdout.write(`Would update desktop version from ${currentVersion} to ${nextVersion}\n`);
  process.stdout.write(`Would create tag ${tag}\n`);
  if (push) {
    process.stdout.write('Would push commit and tag\n');
  }
  process.exit(0);
}

ensureWorkingTreeClean();

packageJson.version = nextVersion;
writeFileSync(desktopPackagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

const statusAfterWrite = listWorkspaceChanges();
if (statusAfterWrite.length !== 1 || statusAfterWrite[0] !== 'packages/desktop/package.json') {
  throw new Error(`Release edit failed: unexpected changes after version bump (${statusAfterWrite.join(', ')}).`);
}

run('git add packages/desktop/package.json', { cwd: workspaceRoot });
run(`git commit -m "chore: bump desktop version to ${nextVersion}"`, { cwd: workspaceRoot });
run(`git tag -a ${tag} -m "${tag}"`, { cwd: workspaceRoot });

if (push) {
  run('git push origin HEAD', { cwd: workspaceRoot });
  run(`git push origin ${tag}`, { cwd: workspaceRoot });
}

process.stdout.write(`Desktop release prepared for ${tag}\n`);
