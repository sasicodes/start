import { playToggleSound, setSoundsEnabled, soundsEnabled } from '@renderer/ui/sounds';
import { Toggle } from '@renderer/ui/toggle';

export const Sounds = () => {
  const save = (enabled: boolean) => {
    setSoundsEnabled(enabled);
    if (enabled) playToggleSound();
  };

  return (
    <div class="mt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">In-app sounds</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Play short sounds as you use the app.</p>
        </div>
        <Toggle onChange={save} label="In-app sounds" checked={soundsEnabled.value} />
      </div>
    </div>
  );
};
