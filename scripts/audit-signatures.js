import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

const targets = [
  { name: 'workspace root', cwd: workspaceRoot },
  { name: '@start/desktop', cwd: new URL('../packages/desktop/', import.meta.url) }
];

const maxAttempts = 3;
const retryDelayMs = 5000;

const missingKeyCode = 'EMISSINGSIGNATUREKEY';
const integrityCode = 'EINTEGRITYSIGNATURE';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runAudit = (cwd) => {
  const result = spawnSync('npm', ['audit', 'signatures'], { cwd, encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(output);
  return { output, status: result.status ?? 1 };
};

const isMissingKeyOnly = (output) => output.includes(missingKeyCode) && !output.includes(integrityCode);

const auditTarget = async ({ name, cwd }) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { output, status } = runAudit(cwd);
    if (status === 0) return true;

    if (!isMissingKeyOnly(output)) {
      process.stderr.write(`Signature audit failed for ${name} with an integrity error.\n`);
      return false;
    }

    if (attempt < maxAttempts) {
      process.stderr.write(
        `Attestation public key missing for ${name} (attempt ${attempt}/${maxAttempts}); retrying.\n`
      );
      await sleep(retryDelayMs);
    }
  }

  process.stderr.write(
    `Skipping signature audit for ${name}: the registry could not resolve an attestation public key (${missingKeyCode}). This is a registry-side availability issue, not an integrity failure.\n`
  );
  return true;
};

for (const target of targets) {
  if (!(await auditTarget(target))) process.exit(1);
}
