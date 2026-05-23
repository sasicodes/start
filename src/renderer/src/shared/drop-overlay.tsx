import { cn } from '@renderer/utils/cn';

export const DropOverlay = ({ visible }: { visible: boolean }) => (
  <div
    aria-hidden={!visible}
    class={cn(
      'pointer-events-none absolute inset-0 z-[999] flex items-end justify-center overflow-hidden pb-8 transition-opacity duration-150 ease-out',
      visible ? 'opacity-100' : 'opacity-0'
    )}
  >
    <div class="absolute inset-0 bg-composer/84" />
    <div class="absolute -inset-24 animate-[drop-corner-drift_3.8s_ease-in-out_infinite] bg-[radial-gradient(circle_at_8%_6%,var(--drop-corner-sakura),transparent_34%),radial-gradient(circle_at_92%_8%,var(--drop-corner-indigo),transparent_36%),radial-gradient(circle_at_86%_92%,var(--drop-corner-sakura-soft),transparent_38%)]" />
    <div class="absolute inset-0 animate-[drop-edge-breathe_4.6s_ease-in-out_infinite] bg-[linear-gradient(90deg,var(--drop-edge-sakura),transparent_22%,transparent_78%,var(--drop-edge-indigo)),linear-gradient(180deg,var(--drop-edge-indigo),transparent_18%,transparent_88%,var(--drop-edge-sakura))]" />
    <div
      class={cn(
        'relative grid gap-1 text-center text-ink drop-shadow-[0_12px_28px_oklch(0%_0_0/0.18)] transition-transform duration-150 ease-out',
        visible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
      )}
    >
      <span class="text-sm leading-5 font-semibold">Drop to attach</span>
    </div>
  </div>
);
