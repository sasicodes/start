import type { CliInstallStatus } from '@preload/index';
import { Toggle } from '@renderer/ui/toggle';
import { useEffect, useState } from 'preact/hooks';

const statusText = (status: CliInstallStatus | null) => {
  if (!status || status.status === 'installed' || status.status === 'not-installed' || status.status === 'unavailable')
    return '';
  return status.reason;
};

const actionable = (status: CliInstallStatus | null) =>
  Boolean(status && status.status !== 'unavailable' && status.status !== 'conflict');

let cachedCliInstallStatus: CliInstallStatus | null = null;

export const CliInstall = () => {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<CliInstallStatus | null>(cachedCliInstallStatus);

  useEffect(() => {
    let active = true;
    window.pi.app
      .cliInstallStatus()
      .then((result) => {
        cachedCliInstallStatus = result;
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setError('Command line install status could not be checked.');
      });

    return () => {
      active = false;
    };
  }, []);

  const installed = status?.status === 'installed';

  const apply = async () => {
    if (busy || !actionable(status)) return;

    setError('');
    setBusy(true);

    try {
      const result = installed ? await window.pi.app.uninstallCli() : await window.pi.app.installCli();
      cachedCliInstallStatus = result.status;
      setStatus(result.status);
      setError(result.error ?? '');
    } catch {
      setError(installed ? 'Command line tool could not be removed.' : 'Command line tool could not be installed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="mt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Command line</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Use start . to open folders in Start.</p>
        </div>
        <Toggle onChange={apply} checked={installed} label="Command line" disabled={busy || !actionable(status)} />
      </div>
      {(error || statusText(status)) && (
        <p class="m-0 mt-2 text-xs leading-4 text-danger">{error || statusText(status)}</p>
      )}
    </div>
  );
};
