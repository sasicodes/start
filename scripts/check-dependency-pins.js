import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));
const packageDirectory = join(workspaceRoot, 'packages');
const packageJsonName = 'package.json';
const dependencySections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const localSpecPrefixes = ['file:', 'link:', 'patch:', 'workspace:'];
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isLocalSpec = (spec) => localSpecPrefixes.some((prefix) => spec.startsWith(prefix));
const isPinnedSpec = (spec) => exactVersionPattern.test(spec) || isLocalSpec(spec);
const readPackageJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const formatPath = (path) => relative(workspaceRoot, path) || packageJsonName;

const listPackageJsonPaths = () => {
  const rootPackageJsonPath = join(workspaceRoot, packageJsonName);

  if (!existsSync(packageDirectory)) {
    return [rootPackageJsonPath];
  }

  const workspacePackageJsonPaths = readdirSync(packageDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packageDirectory, entry.name, packageJsonName))
    .filter(existsSync);

  return [rootPackageJsonPath, ...workspacePackageJsonPaths];
};

const validateDependency = (section, name, spec) => {
  if (typeof spec !== 'string') {
    return [`${section}.${name}: non-string spec`];
  }

  return isPinnedSpec(spec) ? [] : [`${section}.${name}: ${spec}`];
};

const validateSection = (packageJson, section) => {
  const dependencies = packageJson[section];

  if (!isRecord(dependencies)) {
    return [];
  }

  return Object.entries(dependencies).flatMap(([name, spec]) => validateDependency(section, name, spec));
};

const validatePackageJson = (path) => {
  const packageJson = readPackageJson(path);
  const violations = dependencySections.flatMap((section) => validateSection(packageJson, section));

  return violations.map((violation) => `${formatPath(path)} ${violation}`);
};

const violations = listPackageJsonPaths().flatMap(validatePackageJson);

if (violations.length > 0) {
  process.stderr.write(
    `Direct dependency specs must be pinned exactly. Fix these specs:\n${violations
      .map((violation) => `- ${violation}`)
      .join('\n')}\n`
  );
  process.exit(1);
}
