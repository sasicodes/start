import { execFile } from 'node:child_process';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { appName, appId, isMac, isProd } from '@main/application';
import { cliWorkspaceFlag } from '@main/cli/args';
import type { CliInstallResult, CliInstallStatus } from '@preload/index';
import electron from 'electron';

const { app } = electron;

const execFileAsync = promisify(execFile);
const cliBinPath = '/usr/local/bin/start';
const cliMarker = `start-cli:${appId}`;

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const appleScriptString = (value: string) => `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

const currentAppBundlePath = () => path.resolve(path.dirname(app.getPath('exe')), '../..');

export const cliWrapperSource = (appBundlePath: string) => `#!/bin/sh
# ${cliMarker}
app_bundle=${shellQuote(appBundlePath)}

if [ "$#" -gt 1 ]; then
  echo "usage: ${appName} [path]" >&2
  exit 2
fi

target=\${1:-.}
case "$target" in
  /*) workspace=$target ;;
  *) workspace="$(pwd -P)/$target" ;;
esac

if [ ! -d "$workspace" ]; then
  echo "${appName}: workspace path does not exist or is not a directory: $target" >&2
  exit 1
fi

exec open -n "$app_bundle" --args ${cliWorkspaceFlag} "$workspace"
`;

export const cliInstallScriptSource = (appBundlePath: string) => `#!/bin/sh
set -eu
bin_path=${shellQuote(cliBinPath)}
tmp_path="${cliBinPath}.$$"
marker=${shellQuote(cliMarker)}
trap 'rm -f "$tmp_path"' EXIT

mkdir -p "$(dirname "$bin_path")"
if [ -e "$bin_path" ] && ! grep -q "$marker" "$bin_path"; then
  echo "A different start command already exists at $bin_path." >&2
  exit 17
fi

cat > "$tmp_path" <<'START_CLI'
${cliWrapperSource(appBundlePath)}START_CLI
chmod 755 "$tmp_path"
mv "$tmp_path" "$bin_path"
`;

const unavailableStatus = (): CliInstallStatus | null => {
  if (!isMac) {
    return {
      path: cliBinPath,
      status: 'unavailable',
      reason: 'Command line installation is only available on macOS.'
    };
  }

  if (!isProd) {
    return {
      path: cliBinPath,
      status: 'unavailable',
      reason: 'Command line installation is available from packaged builds.'
    };
  }

  return null;
};

export const getCliInstallStatus = async (): Promise<CliInstallStatus> => {
  const unavailable = unavailableStatus();
  if (unavailable) return unavailable;

  const details = await stat(cliBinPath).catch(() => null);
  if (!details) return { path: cliBinPath, status: 'not-installed' };
  if (!details.isFile()) {
    return {
      path: cliBinPath,
      status: 'conflict',
      reason: 'A non-file entry already exists at the command path.'
    };
  }

  const source = await readFile(cliBinPath, 'utf8').catch(() => '');
  if (!source.includes(cliMarker)) {
    return {
      path: cliBinPath,
      status: 'conflict',
      reason: 'A different start command already exists at this path.'
    };
  }

  if (!source.includes(currentAppBundlePath())) {
    return {
      path: cliBinPath,
      status: 'outdated',
      reason: 'The command points to a different Start build.'
    };
  }

  return { path: cliBinPath, status: 'installed' };
};

export const installCliCommand = async (): Promise<CliInstallResult> => {
  const status = await getCliInstallStatus();
  if (status.status === 'unavailable' || status.status === 'conflict') {
    return { ok: false, status, error: status.reason };
  }

  const scriptPath = path.join(tmpdir(), `start-cli-install-${process.pid}.sh`);
  const script = cliInstallScriptSource(currentAppBundlePath());

  await writeFile(scriptPath, script, { mode: 0o700 });

  try {
    await execFileAsync('/usr/bin/osascript', [
      '-e',
      `do shell script ${appleScriptString(`/bin/sh ${shellQuote(scriptPath)}`)} with administrator privileges`
    ]);
    return { ok: true, status: await getCliInstallStatus() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command line installation failed.';
    return { ok: false, status: await getCliInstallStatus(), error: message };
  } finally {
    await rm(scriptPath, { force: true }).catch(() => {});
  }
};
