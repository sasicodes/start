import { closeMotionTransition, openMotionTransition, quickLayoutTransition } from '@renderer/ui/motion';
import type { TurnDetail } from '@renderer/utils/types';

const diffMetricPattern = /^(.*?)(\+\d+)\s+(-\d+)$/;

const closeAccordionTextTransition = { duration: 0.05, ease: 'easeOut' };
const openAccordionTextTransition = { duration: 0.12, ease: 'easeOut' };

export const accordionLayoutTransition = quickLayoutTransition;

export const accordionContentMotion = {
  animate: {
    height: 'auto',
    opacity: 1,
    y: 0,
    transition: {
      height: openMotionTransition,
      opacity: openAccordionTextTransition,
      y: openAccordionTextTransition
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    y: -2,
    transition: {
      height: closeMotionTransition,
      opacity: closeAccordionTextTransition,
      y: closeAccordionTextTransition
    }
  },
  initial: { height: 0, opacity: 0, y: -2 }
};

export const hasActivityDetails = (details: TurnDetail[], thinking: string) => details.length > 0 || Boolean(thinking);

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
  return match ? { label: match[1], added: match[2], removed: match[3] } : undefined;
};
