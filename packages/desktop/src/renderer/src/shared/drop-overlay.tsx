import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

export const DropOverlay = memo(({ visible }: { visible: boolean }) => (
  <div
    aria-hidden={!visible}
    class={tw(
      'pointer-events-none absolute inset-0 z-50 flex items-end justify-center overflow-hidden pb-8 transition-opacity duration-150 ease-out',
      visible ? 'opacity-100' : 'opacity-0'
    )}
  >
    <div class="absolute inset-0 bg-composer/84" />
    <div class="absolute -inset-24 animate-drop-overlay-corner-drift bg-[radial-gradient(circle_at_8%_6%,var(--overlay-corner-sakura),transparent_34%),radial-gradient(circle_at_92%_8%,var(--overlay-corner-indigo),transparent_36%),radial-gradient(circle_at_86%_92%,var(--overlay-corner-sakura-soft),transparent_38%)]" />
    <div class="absolute inset-0 animate-drop-overlay-edge-breathe bg-[linear-gradient(90deg,var(--overlay-edge-sakura),transparent_22%,transparent_78%,var(--overlay-edge-indigo)),linear-gradient(180deg,var(--overlay-edge-indigo),transparent_18%,transparent_88%,var(--overlay-edge-sakura))]" />
    <div
      class={tw(
        'relative grid gap-1 text-center text-ink drop-shadow-drop-overlay-label transition-transform duration-150 ease-out',
        visible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
      )}
    >
      <span class="text-sm leading-5 font-semibold">Drop to attach</span>
    </div>
  </div>
));
