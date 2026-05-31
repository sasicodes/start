import type { AppSettingsResult } from '@preload/index';
import { useState } from 'preact/hooks';

interface TranslucencyProps {
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Translucency = ({ enabled, onChange }: TranslucencyProps) => {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;

    setError('');
    setSaving(true);

    try {
      const result = await onChange(!enabled);
      setError(result.error ?? '');
    } catch {
      setError('Translucent background could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="mt-5 border-t border-line pt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Translucent background</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Let the desktop show through the app window.</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            toggle().catch(() => {});
          }}
          class="h-9 min-w-24 flex-none rounded-full border border-line bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80 disabled:opacity-55"
        >
          {saving ? 'Saving' : enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {error && <p class="m-0 mt-2 text-xs leading-4 text-danger">{error}</p>}
    </div>
  );
};
