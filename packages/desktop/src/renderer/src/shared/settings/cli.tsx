import type { CliInstallStatus } from '@preload/index';
import { useEffect, useState } from 'preact/hooks';

const statusText = (status: CliInstallStatus | null) => {
  if (!status) return 'Checking command line install';
  if (status.status === 'installed') return `Installed at ${status.path}`;
  if (status.status === 'not-installed') return 'Use start . or start <path> from Terminal.';
  return status.reason;
};

const buttonLabel = (status: CliInstallStatus | null, installing: boolean) => {
  if (installing) return 'Installing';
  if (!status) return 'Install';
  if (status.status === 'installed') return 'Installed';
  if (status.status === 'outdated') return 'Update';
  return 'Install';
};

const installable = (status: CliInstallStatus | null) =>
  Boolean(status && (status.status === 'not-installed' || status.status === 'outdated'));

export const CliInstall = () => {
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState<CliInstallStatus | null>(null);

  useEffect(() => {
    let active = true;
    window.pi.app
      .cliInstallStatus()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setError('Command line install status could not be checked.');
      });

    return () => {
      active = false;
    };
  }, []);

  const install = async () => {
    if (!installable(status) || installing) return;

    setError('');
    setInstalling(true);

    try {
      const result = await window.pi.app.installCli();
      setStatus(result.status);
      setError(result.error ?? '');
    } catch {
      setError('Command line tool could not be installed.');
    } finally {
      setInstalling(false);
    }
  };

  const disabled = installing || !installable(status);

  return (
    <div class="mt-5 flex min-w-0 items-center justify-between gap-4">
      <div class="min-w-0">
        <h2 class="m-0 text-sm leading-5 font-medium text-ink">Command line</h2>
        <p class="m-0 mt-0.5 text-xs leading-4 text-soft">{error || statusText(status)}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          install().catch(() => {});
        }}
        class="h-9 min-w-24 flex-none rounded-full border border-line bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
      >
        {buttonLabel(status, installing)}
      </button>
    </div>
  );
};
