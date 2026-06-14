import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

type CopyText = string | (() => string);

interface CopyButtonProps {
  ariaLabel: string;
  class?: string;
  iconClass?: string;
  text: CopyText;
}

export const useCopied = (duration = 1500) => {
  const timerRef = useRef(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const markCopied = useCallback(() => {
    setCopied(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), duration);
  }, [duration]);

  return { copied, markCopied };
};

export const CopyButton = ({ ariaLabel, class: className, iconClass = 'size-3.5', text }: CopyButtonProps) => {
  const { copied, markCopied } = useCopied();

  const copy = async () => {
    await navigator.clipboard.writeText(typeof text === 'function' ? text() : text).catch(() => {});
    markCopied();
  };

  return (
    <Tooltip label={copied ? 'Copied' : 'Copy'}>
      <button type="button" onClick={copy} aria-label={ariaLabel} class={className}>
        {copied ? <CheckIcon class="size-3" /> : <CopyIcon class={iconClass} />}
      </button>
    </Tooltip>
  );
};
