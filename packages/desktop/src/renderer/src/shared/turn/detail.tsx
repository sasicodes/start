import { Markdown } from '@renderer/markdown';
import {
  accordionContentMotion,
  accordionLayoutTransition,
  detailCount,
  detailMeta,
  detailTarget,
  isCodeMeta,
  splitDiffMetric
} from '@renderer/shared/turn/sequence';
import { ChevronRightIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { TurnDetail } from '@renderer/utils/types';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

interface DetailItemProps {
  detail: TurnDetail;
  renderSubagents?: (detail: TurnDetail) => ComponentChildren;
}

interface DetailTitleProps {
  detail: TurnDetail;
  interactive: boolean;
}

const DetailTitle = ({ detail, interactive }: DetailTitleProps) => {
  const target = detailTarget(detail);
  const index = target ? detail.title.lastIndexOf(target) : -1;
  if (index < 0) return <>{`${detail.title}${detailCount(detail)}`}</>;

  const before = detail.title.slice(0, index);
  const after = detail.title.slice(index + target.length);
  return (
    <>
      {before}
      <span
        class={tw('text-ink', interactive && 'group-hover/detail:text-hover group-focus-visible/detail:text-hover')}
      >
        {target}
      </span>
      {after}
      {detailCount(detail)}
    </>
  );
};

const DetailMetric = ({ value }: { value: string }) => {
  const metric = splitDiffMetric(value);
  if (!metric) return <span class="shrink-0 text-sm leading-5 text-soft">{value}</span>;

  return (
    <span class="shrink-0 text-sm leading-5 text-soft">
      {metric.label}
      <span class="text-success">{metric.added}</span> <span class="text-danger">{metric.removed}</span>
    </span>
  );
};

const DetailContent = ({ detail, meta, renderSubagents }: DetailItemProps & { meta: string }) => {
  const subagents = renderSubagents?.(detail);
  const hasSubagents = Boolean(subagents);

  return (
    <div class="max-w-full text-sm leading-6 text-soft [overflow-wrap:anywhere]">
      {subagents}
      {meta &&
        (isCodeMeta(meta) ? (
          <Markdown source={meta} density="compact" />
        ) : (
          <p class={tw('m-0 text-sm leading-6 text-soft', hasSubagents && 'mt-2')}>{meta}</p>
        ))}
      {detail.body && (
        <div class={tw('max-w-full text-sm leading-6 text-soft [overflow-wrap:anywhere]', meta && 'mt-1')}>
          <Markdown source={detail.body} density="compact" />
        </div>
      )}
    </div>
  );
};

export const ThinkingSection = ({ thinking }: { thinking: string }) => {
  if (!thinking) return null;

  return (
    <div class="text-sm leading-6 text-soft">
      <Markdown source={thinking} density="compact" />
    </div>
  );
};

export const DetailItem = ({ detail, renderSubagents }: DetailItemProps) => {
  const [open, setOpen] = useState(false);
  const meta = detailMeta(detail);
  const active = detail.state === 'active';
  const error = detail.kind === 'error' || detail.state === 'error';
  const subdued = !active && !error;
  const expandable = Boolean(meta || detail.body || detail.subagents?.length);
  const title = (
    <span
      class={tw(
        'min-w-0 whitespace-pre-wrap leading-5',
        error && 'text-danger',
        active && 'text-hover',
        subdued && 'text-soft',
        expandable && subdued && 'group-hover/detail:text-hover group-focus-visible/detail:text-hover'
      )}
    >
      <DetailTitle detail={detail} interactive={expandable && subdued} />
    </span>
  );

  if (!expandable) {
    return (
      <motion.li
        layout="position"
        transition={accordionLayoutTransition}
        class="m-0 flex min-w-0 items-center gap-1.5 text-sm leading-5"
      >
        {title}
        {detail.metric && <DetailMetric value={detail.metric} />}
      </motion.li>
    );
  }

  return (
    <motion.li layout="position" transition={accordionLayoutTransition} class="m-0 text-sm leading-5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        class="group/detail inline-flex max-w-full min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 text-left text-sm leading-5 outline-0 transition-colors hover:text-hover focus-visible:text-hover"
      >
        {title}
        {detail.metric && <DetailMetric value={detail.metric} />}
        <ChevronRightIcon
          class={tw('size-3 flex-none text-soft transition-transform duration-150', open && 'rotate-90')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="detail-content" {...accordionContentMotion} class="overflow-hidden">
            <div class="pt-2">
              <DetailContent detail={detail} meta={meta} {...(renderSubagents ? { renderSubagents } : {})} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};
