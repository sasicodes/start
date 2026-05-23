import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { useState } from 'preact/hooks';

type CopyButtonProps = {
  ariaLabel: string;
  class?: string;
  iconClass?: string;
  text: string;
};

export const CopyButton = ({ ariaLabel, class: className, iconClass = 'size-3.5', text }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <CommonTooltip label={copied ? 'Copied' : 'Copy'}>
      <button
        type="button"
        aria-label={ariaLabel}
        onBlur={() => setCopied(false)}
        onClick={() => void copy()}
        onPointerLeave={() => setCopied(false)}
        class={className}
      >
        {copied ? <CheckIcon class="size-3" /> : <CopyIcon class={iconClass} />}
      </button>
    </CommonTooltip>
  );
};
