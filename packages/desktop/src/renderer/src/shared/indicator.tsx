import { tw } from '@renderer/utils/tw';

type IndicatorKind = 'generating' | 'completed' | 'failed';

interface IndicatorProps {
  kind?: IndicatorKind;
}

export const Indicator = ({ kind = 'completed' }: IndicatorProps) => (
  <span
    aria-hidden="true"
    class={tw(
      'block size-2 flex-none rounded-full',
      kind === 'failed' && 'bg-danger',
      kind === 'completed' && 'bg-success',
      kind === 'generating' && 'bg-blue-500'
    )}
  />
);
