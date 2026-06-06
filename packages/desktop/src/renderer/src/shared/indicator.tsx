import { animationActive } from '@renderer/shared/animation';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { tw } from '@renderer/utils/tw';

type IndicatorKind = 'generating' | 'completed' | 'failed';

interface IndicatorProps {
  kind?: IndicatorKind;
}

export const Indicator = ({ kind = 'completed' }: IndicatorProps) => {
  const appFocused = useAppFocusState(kind === 'generating');
  const active = animationActive(appFocused, kind === 'generating');

  return (
    <span
      aria-hidden="true"
      class={tw(
        'block size-2 flex-none rounded-full',
        kind === 'failed' && 'bg-danger',
        kind === 'completed' && 'bg-success',
        kind === 'generating' && 'bg-progress',
        active && 'animate-pulse motion-reduce:animate-none'
      )}
    />
  );
};
