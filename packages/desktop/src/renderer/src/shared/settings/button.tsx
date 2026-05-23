import { useAppFocusState } from '@renderer/shared/app-focus';
import { SettingsIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

interface SettingsButtonProps {
  active: boolean;
  onOpenSettings: () => void;
}

export const SettingsButton = memo(({ active, onOpenSettings }: SettingsButtonProps) => {
  const appFocused = useAppFocusState();

  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={onOpenSettings}
      aria-label="Open settings"
      class={tw(
        'grid size-11.5 shrink-0 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-[background-color,opacity] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control',
        active && 'bg-control',
        !appFocused && 'pointer-events-none opacity-0'
      )}
    >
      <SettingsIcon class="size-5" />
    </button>
  );
});
