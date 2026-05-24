import { tw } from '@renderer/utils/tw';

type NoticeDotKind = 'idle' | 'generating' | 'completed' | 'failed';

interface NoticeDotProps {
  kind?: NoticeDotKind;
}

export const NoticeDot = ({ kind = 'completed' }: NoticeDotProps) => (
  <span
    aria-hidden="true"
    class={tw(
      'size-2 flex-none rounded-full',
      kind === 'idle' && 'bg-soft',
      kind === 'failed' && 'bg-danger',
      kind === 'completed' && 'bg-success',
      kind === 'generating' && 'bg-blue-500'
    )}
  />
);
