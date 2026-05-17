import { SettingsIcon } from '@renderer/ui/icons';

export const SettingsButton = ({ onOpenSettings }: { onOpenSettings: () => void }) => (
  <button
    type="button"
    aria-label="Open settings"
    onClick={onOpenSettings}
    class="absolute right-4.5 bottom-4.5 z-40 grid size-11.5 place-items-center rounded-full border-0 bg-composer text-ink shadow-shell select-none [-webkit-app-region:no-drag]"
  >
    <SettingsIcon class="size-5" />
  </button>
);
