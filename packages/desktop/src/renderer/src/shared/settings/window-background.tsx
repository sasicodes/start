import type { AppSettingsResult } from '@preload/index';
import { tw } from '@renderer/utils/tw';
import { useState } from 'preact/hooks';

interface WindowBackgroundProps {
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<AppSettingsResult>;
}

export const WindowBackground = ({ enabled, onChange }: WindowBackgroundProps) => {
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
      setError('Window background could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="mt-5 border-t border-line pt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Solid window background</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Turn this on if transparent windows are hard to read.</p>
        </div>
        <button
          type="button"
          role="switch"
          disabled={saving}
          aria-label="Use solid window background"
          aria-checked={enabled}
          onClick={() => {
            toggle().catch(() => {});
          }}
          class={tw(
            'relative h-7 w-12 flex-none rounded-full border border-line p-0 transition-colors duration-150 ease-out disabled:opacity-55',
            enabled ? 'bg-ink' : 'bg-control'
          )}
        >
          <span
            class={tw(
              'absolute top-1 grid size-5 place-items-center rounded-full bg-panel shadow-shell transition-transform duration-150 ease-out',
              enabled ? 'translate-x-5.5' : 'translate-x-1'
            )}
          />
        </button>
      </div>
      {error && <p class="m-0 mt-2 text-xs leading-4 text-danger">{error}</p>}
    </div>
  );
};
