import { Button } from '@base-ui/react/button';
import { composerShowsStop, composerStopping, composerSubmitDisabled } from '@renderer/shared/composer/submit';
import { ArrowUpIcon, CodeIcon, StopIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

interface GenerateProps {
  draft: string;
  onStop: () => void;
  commandMode: boolean;
  isGenerating: boolean;
  disabledReason?: string;
  editing?: 'starting' | 'editing' | 'saving';
}

interface SubmitButtonProps {
  label: string;
  disabled: boolean;
  children: ComponentChildren;
}

const SubmitButton = ({ label, disabled, children }: SubmitButtonProps) => (
  <Button
    type="submit"
    disabled={disabled}
    aria-label={label}
    className="relative grid size-9.5 place-items-center rounded-full border-0 bg-brand text-brand-ink shadow-nav select-none transition-[opacity,transform] duration-100 active:scale-90 hover:opacity-90 disabled:pointer-events-none disabled:opacity-25 [&_svg]:size-4"
  >
    {children}
  </Button>
);

export const Generate = ({ draft, onStop, commandMode, isGenerating, disabledReason, editing }: GenerateProps) => {
  const [stopRequested, setStopRequested] = useState(false);
  const stopping = composerStopping({ stopping: stopRequested, isGenerating });

  if (stopRequested !== stopping) setStopRequested(stopping);

  if (editing) {
    return (
      <SubmitButton label="Save goal" disabled={editing !== 'editing' || !draft.trim()}>
        <ArrowUpIcon strokeWidth={2} />
      </SubmitButton>
    );
  }

  if (composerShowsStop(draft, isGenerating)) {
    const stop = () => {
      if (stopping) return;
      setStopRequested(true);
      onStop();
    };

    return (
      <button
        type="button"
        onClick={stop}
        aria-label="Stop"
        aria-busy={stopping}
        class={tw(
          'relative grid size-9.5 place-items-center rounded-full border-0 bg-brand text-brand-ink shadow-nav select-none transition-[opacity,transform] duration-100 active:scale-90 [&_svg]:size-4',
          stopping ? 'opacity-60' : 'hover:opacity-90'
        )}
      >
        <StopIcon />
      </button>
    );
  }

  const label = isGenerating ? 'Queue follow-up' : commandMode ? 'Run command' : 'Send';
  const disabled = composerSubmitDisabled({
    draft,
    commandMode,
    isGenerating,
    ...(disabledReason ? { disabledReason } : {})
  });

  return (
    <Tooltip label={disabledReason ?? ''} disabled={!disabledReason}>
      <span class="inline-grid">
        <SubmitButton label={label} disabled={disabled}>
          {commandMode ? <CodeIcon strokeWidth={2} /> : <ArrowUpIcon strokeWidth={2} />}
        </SubmitButton>
      </span>
    </Tooltip>
  );
};
