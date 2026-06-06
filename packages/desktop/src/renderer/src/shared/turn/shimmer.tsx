import { animationActive } from '@renderer/shared/animation';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface ShimmerTextProps {
  className?: string;
  children: ComponentChildren;
}

export const ShimmerText = ({ className, children }: ShimmerTextProps) => {
  const appFocused = useAppFocusState();
  const active = animationActive(appFocused);

  return (
    <span
      class={tw(
        'inline-block max-w-full truncate',
        active &&
          'bg-[image:var(--shimmer-gradient)] [background-size:240%_100%] bg-clip-text text-transparent [-webkit-background-clip:text] animate-[activity-text-shimmer_2.4s_linear_infinite] motion-reduce:bg-none motion-reduce:text-soft motion-reduce:animate-none',
        className
      )}
    >
      {children}
    </span>
  );
};
