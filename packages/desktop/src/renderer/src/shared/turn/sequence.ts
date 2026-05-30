import type { TurnActivityItem, TurnDetail } from '@renderer/utils/types';
import type { Transition } from 'motion/react';

const diffMetricPattern = /^(.*?)(\+\d+)\s+(-\d+)$/;

const closeAccordionTextTransition = { duration: 0.05, ease: 'easeOut' } as const satisfies Transition;
const closeAccordionHeightTransition = { duration: 0.07, ease: 'easeOut' } as const satisfies Transition;
const openAccordionTextTransition = { duration: 0.12, ease: 'easeOut' } as const satisfies Transition;
const openAccordionHeightTransition = { duration: 0.12, ease: 'easeOut' } as const satisfies Transition;

export const accordionLayoutTransition = { duration: 0.08, ease: 'easeOut' } as const satisfies Transition;

export const accordionContentMotion = {
  animate: {
    height: 'auto',
    opacity: 1,
    y: 0,
    transition: {
      height: openAccordionHeightTransition,
      opacity: openAccordionTextTransition,
      y: openAccordionTextTransition
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    y: -2,
    transition: {
      height: closeAccordionHeightTransition,
      opacity: closeAccordionTextTransition,
      y: closeAccordionTextTransition
    }
  },
  initial: { height: 0, opacity: 0, y: -2 }
};

export const activitySequence = (
  details: TurnDetail[],
  thinking: string,
  items: TurnActivityItem[] = []
): TurnActivityItem[] => {
  if (items.length > 0) return items;

  return [
    ...(thinking
      ? [
          {
            createdAt: 0,
            updatedAt: 0,
            text: thinking,
            id: 'thinking',
            type: 'thinking' as const
          }
        ]
      : []),
    ...details.map((detail) => ({
      detail,
      id: detail.id,
      type: 'detail' as const
    }))
  ];
};

export const hasActivityDetails = (details: TurnDetail[], thinking: string, items: TurnActivityItem[] = []) =>
  activitySequence(details, thinking, items).length > 0;

export const detailCount = (detail: TurnDetail) => (detail.count > 1 ? ` ×${detail.count}` : '');

export const detailMeta = (detail: TurnDetail) => {
  const meta = detail.detail ?? '';
  return meta && !detail.title.includes(meta) ? meta : '';
};

export const detailTarget = (detail: TurnDetail) => {
  const target = detail.detail ?? '';
  return target && detail.title.includes(target) ? target : '';
};

export const isCodeMeta = (value: string) => /^`{3,}[^`]*\n/.test(value.trim());

export const splitDiffMetric = (value: string) => {
  const match = diffMetricPattern.exec(value);
  if (!match) return null;

  return { label: match[1], added: match[2], removed: match[3] };
};
