import { useAppFocusState } from '@renderer/shared/app-focus';
import { SettingsIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

export const SettingsButton = memo(({ onOpenSettings }: { onOpenSettings: () => void }) => {
  const appFocused = useAppFocusState();

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      aria-label="Open settings"
      class={tw(
        'absolute right-4.5 bottom-4.5 z-40 grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell outline-0 transition-[background-color,opacity] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control [-webkit-app-region:no-drag] @max-bottom-controls/chat:pointer-events-none @max-bottom-controls/chat:opacity-0',
        !appFocused && 'pointer-events-none opacity-0'
      )}
    >
      <SettingsIcon class="size-5" />
    </button>
  );
});
