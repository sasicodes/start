import { useMorph } from '@renderer/shared/browser/use-morph';
import { motion, useTransform } from 'motion/react';

interface BrowserReloadIconProps {
  loading: boolean;
}

const morphTransition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] } as const;

const REFRESH_TIP_TR = [19.25, 3.75, 19.25, 7.75, 15.25, 7.75] as const;
const REFRESH_TIP_BL = [4.7383, 20.25, 4.7383, 16.25, 8.7383, 16.25] as const;
const REFRESH_ARC_R = [
  20.186, 10.9688, 20.2281, 11.3066, 20.2498, 11.6508, 20.2498, 12, 20.2498, 16.5563, 16.5562, 20.25, 11.9998, 20.25,
  9.3233, 20.25, 6.8887, 18.9754, 5.3677, 17
] as const;
const REFRESH_ARC_L = [
  3.8138, 13.0312, 3.7717, 12.6934, 3.75, 12.3492, 3.75, 12, 3.75, 7.4437, 7.4437, 3.75, 12, 3.75, 14.6766, 3.75,
  17.1111, 5.0246, 18.6322, 7
] as const;

const X_TIP_TR = [19, 5, 15.5, 8.5, 12, 12] as const;
const X_TIP_BL = [5, 19, 8.5, 15.5, 12, 12] as const;
const X_ARC_R = [
  19, 19, 18.2222, 18.2222, 17.4444, 17.4444, 16.6667, 16.6667, 15.8889, 15.8889, 15.1111, 15.1111, 14.3333, 14.3333,
  13.5556, 13.5556, 12.7778, 12.7778, 12, 12
] as const;
const X_ARC_L = [
  5, 5, 5.7778, 5.7778, 6.5556, 6.5556, 7.3333, 7.3333, 8.1111, 8.1111, 8.8889, 8.8889, 9.6667, 9.6667, 10.4444,
  10.4444, 11.2222, 11.2222, 12, 12
] as const;

const lerp = (from: readonly number[], to: readonly number[], t: number) =>
  from.map((value, index) => value + ((to[index] ?? value) - value) * t);

const tipPath = (n: number[]) => `M${n[0]} ${n[1]}L${n[2]} ${n[3]}L${n[4]} ${n[5]}`;
const arcPath = (n: number[]) =>
  `M${n[0]} ${n[1]}C${n[2]} ${n[3]} ${n[4]} ${n[5]} ${n[6]} ${n[7]}C${n[8]} ${n[9]} ${n[10]} ${n[11]} ${n[12]} ${n[13]}C${n[14]} ${n[15]} ${n[16]} ${n[17]} ${n[18]} ${n[19]}`;

export const BrowserReloadIcon = ({ loading }: BrowserReloadIconProps) => {
  const progress = useMorph(loading ? 1 : 0, morphTransition);
  const arcRD = useTransform(progress, (t) => arcPath(lerp(REFRESH_ARC_R, X_ARC_R, t)));
  const arcLD = useTransform(progress, (t) => arcPath(lerp(REFRESH_ARC_L, X_ARC_L, t)));
  const tipTRD = useTransform(progress, (t) => tipPath(lerp(REFRESH_TIP_TR, X_TIP_TR, t)));
  const tipBLD = useTransform(progress, (t) => tipPath(lerp(REFRESH_TIP_BL, X_TIP_BL, t)));

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" class="size-4">
      <motion.path d={tipBLD} stroke-width="1.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      <motion.path d={tipTRD} stroke-width="1.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      <motion.path d={arcRD} stroke-width="1.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      <motion.path d={arcLD} stroke-width="1.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
};
