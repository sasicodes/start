import { execFileSync } from 'node:child_process';
import { delimiter, join } from 'node:path';
import { baseDir, isMac } from '@main/application';

const shellEnvironmentMarker = '__START_SHELL_ENV__';
const shellEnvironmentCommand = `printf '${shellEnvironmentMarker}\\0'; command env -0`;
const shellEnvironmentTimeoutMs = 1500;

process.env.PI_OAUTH_CALLBACK_HOST ??= 'localhost';
process.env.PI_CODING_AGENT_DIR ??= join(baseDir, 'agent');
process.env.PI_OFFLINE ??= '1';
process.env.PI_SKIP_VERSION_CHECK ??= '1';
process.env.PI_TELEMETRY ??= '0';

const readEnvironmentValue = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) return;
  return value;
};

export const shellEnvironmentPayload = (value: string) => {
  const marker = `${shellEnvironmentMarker}\0`;
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return '';
  return value.slice(markerIndex + marker.length);
};

export const parseShellEnvironment = (value: string) => {
  const environment = new Map<string, string>();

  for (const entry of shellEnvironmentPayload(value).split('\0')) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0) continue;
    environment.set(entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1));
  }

  return environment;
};

const pathEntries = (value: string) =>
  value
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

export const mergePathValues = (primary: string, fallback: string) => {
  const seen = new Set<string>();
  const entries = [...pathEntries(primary), ...pathEntries(fallback)].filter((entry) => {
    if (seen.has(entry)) return false;
    seen.add(entry);
    return true;
  });

  return entries.join(delimiter);
};

const shellEnvironmentDisabled = () => readEnvironmentValue('NODE_ENV') === 'test';

const shellForEnvironment = () => readEnvironmentValue('SHELL') ?? '/bin/zsh';

const applyShellEnvironment = (shellEnvironment: Map<string, string>) => {
  const shellPath = shellEnvironment.get('PATH')?.trim();
  if (!shellPath) return;
  process.env.PATH = mergePathValues(shellPath, readEnvironmentValue('PATH') ?? '');
};

const installShellEnvironment = () => {
  if (!isMac || shellEnvironmentDisabled()) return;

  try {
    const output = execFileSync(shellForEnvironment(), ['-lc', shellEnvironmentCommand], {
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: shellEnvironmentTimeoutMs
    });
    applyShellEnvironment(parseShellEnvironment(output));
  } catch {}
};

installShellEnvironment();

export const environment = {
  rendererUrl: readEnvironmentValue('ELECTRON_RENDERER_URL')
} as const;
