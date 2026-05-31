import type { CliInstallStatus } from '@preload/index';
import { useEffect, useState } from 'preact/hooks';

const statusText = (status: CliInstallStatus | null) => {
  if (!status || status.status === 'installed' || status.status === 'not-installed') return '';
  return status.reason;
};

const buttonLabel = (status: CliInstallStatus | null, installing: boolean) => {
  if (installing) return 'Installing';
  if (!status) return 'Checking';
  if (status.status === 'installed') return 'Installed';
  if (status.status === 'outdated') return 'Update';
  return 'Install';
};

const installable = (status: CliInstallStatus | null) =>
  Boolean(status && (status.status === 'not-installed' || status.status === 'outdated'));

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
        if (active) {
          setStatus(result);
        }
      })
      .catch(() => {
        if (active) setError('Command line install status could not be checked.');
      });

    return () => {
      active = false;
    };
  }, []);

  const install = async () => {
    if (!installable(status) || busy) return;

    setError('');
    setBusy(true);

    try {
      const result = await window.pi.app.installCli();
      cachedCliInstallStatus = result.status;
      setStatus(result.status);
      setError(result.error ?? '');
    } catch {
      setError('Command line tool could not be installed.');
    } finally {
      setBusy(false);
    }
  };

  const canInstall = installable(status);
  const disabled = busy || !canInstall;

  return (
    <div class="mt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Command line</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Open workspaces from Terminal with start .</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            install().catch(() => {});
          }}
          class="h-9 min-w-24 flex-none rounded-full border border-line bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
        >
          {buttonLabel(status, busy)}
        </button>
      </div>
      {(error || statusText(status)) && (
        <p class="m-0 mt-2 text-xs leading-4 text-danger">{error || statusText(status)}</p>
      )}
    </div>
  );
};
