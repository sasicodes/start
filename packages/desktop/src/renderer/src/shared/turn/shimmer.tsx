import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface ShimmerTextProps {
  className?: string;
  children: ComponentChildren;
}

export const ShimmerText = ({ className, children }: ShimmerTextProps) => (
  <span
    class={tw(
      'inline-block max-w-full truncate bg-[linear-gradient(100deg,var(--color-soft)_0_42%,oklch(48%_0.16_35_/_0.92)_49%,oklch(70%_0.19_35_/_0.72)_52%,var(--color-soft)_59%_100%)] [background-size:240%_100%] bg-clip-text text-transparent [-webkit-background-clip:text] animate-[activity-text-shimmer_1.8s_linear_infinite] motion-reduce:bg-none motion-reduce:text-soft motion-reduce:animate-none',
      className
    )}
  >
    {children}
  </span>
);
