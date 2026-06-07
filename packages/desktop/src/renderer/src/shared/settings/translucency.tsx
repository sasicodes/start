import type { AppSettingsResult } from '@preload/index';
import { Toggle } from '@renderer/ui/toggle';
import { useState } from 'preact/hooks';

interface TranslucencyProps {
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const Translucency = ({ enabled, onChange }: TranslucencyProps) => {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (next: boolean) => {
    if (saving) return;

    setError('');
    setSaving(true);

    try {
      const result = await onChange(next);
      setError(result.error ?? '');
    } catch {
      setError('Translucent background could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="mt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Translucent background</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Let the desktop show through the app window.</p>
        </div>
        <Toggle
          checked={enabled}
          disabled={saving}
          label="Translucent background"
          onChange={(next) => {
            save(next).catch(() => {});
          }}
        />
      </div>
      {error && <p class="m-0 mt-2 text-xs leading-4 text-danger">{error}</p>}
    </div>
  );
};
