import { Markdown } from '@renderer/markdown/markdown';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import type { TurnDetail } from '@renderer/utils/types';
import { useState } from 'preact/hooks';

type TurnDetailsProps = {
  createdAt: number;
  details: TurnDetail[];
  streaming: boolean;
  thinking: string;
};

type DetailItemProps = {
  detail: TurnDetail;
};

const hasDetails = (details: TurnDetail[], thinking: string) => details.length > 0 || Boolean(thinking);

const detailTone = (detail: TurnDetail) => {
  if (detail.kind === 'error' || detail.state === 'error') return 'text-danger';
  if (detail.state === 'active') return 'text-hover';
  return 'text-soft';
};

const detailCount = (detail: TurnDetail) => (detail.count > 1 ? ` ×${detail.count}` : '');

const DetailTitle = ({ detail }: DetailItemProps) => {
  const target = detail.kind === 'tool' ? (detail.detail ?? '') : '';
  const index = target ? detail.title.lastIndexOf(target) : -1;
  if (index < 0) return <>{`${detail.title}${detailCount(detail)}`}</>;

  const before = detail.title.slice(0, index);
  const after = detail.title.slice(index + target.length);
  return (
    <>
      {before}
      <span class="text-ink">{target}</span>
      {after}
      {detailCount(detail)}
    </>
  );
};

const durationLabel = (durationMs: number) => {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  if (seconds < 2) return 'Worked briefly';
  if (seconds < 60) return `Worked for ${seconds} seconds`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    const minuteLabel = `${minutes} minute${minutes === 1 ? '' : 's'}`;
    const secondLabel = `${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
    return remainingSeconds > 0 ? `Worked for ${minuteLabel} and ${secondLabel}` : `Worked for ${minuteLabel}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
  const minuteLabel = `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
  return remainingMinutes > 0 ? `Worked for ${hourLabel} and ${minuteLabel}` : `Worked for ${hourLabel}`;
};

const workLabel = (createdAt: number, details: TurnDetail[], streaming: boolean) => {
  const timestamps = [createdAt, ...details.flatMap((detail) => [detail.createdAt, detail.updatedAt])].filter(
    (timestamp) => timestamp > 0
  );
  if (timestamps.length === 0) return 'Worked briefly';

  const startedAt = Math.min(...timestamps);
  const endedAt = streaming ? Date.now() : Math.max(...timestamps);
  return durationLabel(endedAt - startedAt);
};

const DetailItem = ({ detail }: DetailItemProps) => (
  <li class={cn('m-0 whitespace-pre-wrap text-xs leading-5', detailTone(detail))}>
    <DetailTitle detail={detail} />
    {detail.body && (
      <div class="mt-1 text-xs leading-5 text-soft">
        <Markdown source={detail.body} />
      </div>
    )}
  </li>
);

const ThinkingSection = ({ thinking }: { thinking: string }) => {
  if (!thinking) return null;

  return (
    <div class="text-xs leading-5 text-soft">
      <Markdown source={thinking} />
    </div>
  );
};

export const TurnDetails = ({ createdAt, details, streaming, thinking }: TurnDetailsProps) => {
  const [open, setOpen] = useState(false);
  if (!hasDetails(details, thinking)) return null;

  const label = workLabel(createdAt, details, streaming);

  return (
    <div class="mb-1.5 max-w-full text-xs leading-5 text-soft">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        class="flex items-center gap-0.5 rounded-md border-0 bg-transparent px-0 py-0 text-left text-xs leading-none text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover"
      >
        <span class="leading-none">{label}</span>
        <ChevronDownIcon class={cn('size-3 shrink-0 transition-transform ease-in', !open && '-rotate-90')} />
      </button>
      {open && (
        <div class="mt-2 max-h-80 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div class="flex flex-col gap-2">
            <ThinkingSection thinking={thinking} />
            {details.length > 0 && (
              <ul class="m-0 flex list-none flex-col gap-2 p-0">
                {details.map((detail) => (
                  <DetailItem key={detail.id} detail={detail} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
