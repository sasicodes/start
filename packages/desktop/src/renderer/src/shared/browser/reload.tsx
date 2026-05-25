import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'preact/hooks';

interface BrowserReloadIconProps {
  loading: boolean;
}

const REFRESH_TIP = [9.25, 14.75, 9.25, 20.25, 3.75, 20.25] as const;
const X_TIP = [3.75, 3.75, 12, 12, 20.25, 20.25] as const;

const REFRESH_ARC = [
  15.2493, 4.41452, 14.2521, 3.98683, 13.1537, 3.75, 12, 3.75, 7.44365, 3.75, 3.75, 7.44365, 3.75, 12, 3.75, 15.498,
  5.92698, 18.4875, 9, 19.6876
] as const;
const X_ARC = [
  20.25, 3.75, 18.4167, 5.5833, 16.5833, 7.4167, 14.75, 9.25, 12.9167, 11.0833, 11.0833, 12.9167, 9.25, 14.75, 7.4167,
  16.5833, 5.5833, 18.4167, 3.75, 20.25
] as const;

const lerp = (from: readonly number[], to: readonly number[], t: number) =>
  from.map((value, index) => value + ((to[index] ?? value) - value) * t);

const tipPath = (n: number[]) => `M${n[0]} ${n[1]}L${n[2]} ${n[3]}L${n[4]} ${n[5]}`;
const arcPath = (n: number[]) =>
  `M${n[0]} ${n[1]}C${n[2]} ${n[3]} ${n[4]} ${n[5]} ${n[6]} ${n[7]}C${n[8]} ${n[9]} ${n[10]} ${n[11]} ${n[12]} ${n[13]}C${n[14]} ${n[15]} ${n[16]} ${n[17]} ${n[18]} ${n[19]}`;

const morphTransition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] } as const;
const dotsTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;

export const BrowserReloadIcon = ({ loading }: BrowserReloadIconProps) => {
  const progress = useMotionValue(loading ? 1 : 0);
  const tipD = useTransform(progress, (t) => tipPath(lerp(REFRESH_TIP, X_TIP, t)));
  const arcD = useTransform(progress, (t) => arcPath(lerp(REFRESH_ARC, X_ARC, t)));

  useEffect(() => {
    const controls = animate(progress, loading ? 1 : 0, morphTransition);
    return () => controls.stop();
  }, [loading, progress]);

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" class="size-4">
      <motion.g animate={{ opacity: loading ? 0 : 1 }} transition={dotsTransition}>
        <path
          d="M13 21C13.5523 21 14 20.5523 14 20C14 19.4477 13.5523 19 13 19C12.4477 19 12 19.4477 12 20C12 20.5523 12.4477 21 13 21Z"
          fill="currentColor"
        />
        <path
          d="M21 11C21 10.4477 20.5523 9.99999 20 9.99999C19.4477 9.99999 19 10.4477 19 11C19 11.5523 19.4477 12 20 12C20.5523 12 21 11.5523 21 11Z"
          fill="currentColor"
        />
        <path
          d="M19.9295 14.2679C20.4078 14.5441 20.5716 15.1557 20.2955 15.634C20.0193 16.1123 19.4078 16.2761 18.9295 16C18.4512 15.7238 18.2873 15.1123 18.5634 14.634C18.8396 14.1557 19.4512 13.9918 19.9295 14.2679Z"
          fill="currentColor"
        />
        <path
          d="M17.3676 19.2942C17.8459 19.0181 18.0098 18.4065 17.7336 17.9282C17.4575 17.4499 16.8459 17.286 16.3676 17.5621C15.8893 17.8383 15.7254 18.4499 16.0016 18.9282C16.2777 19.4065 16.8893 19.5703 17.3676 19.2942Z"
          fill="currentColor"
        />
        <path
          d="M18.9269 7.99998C18.4487 8.27612 17.8371 8.11225 17.5609 7.63396C17.2848 7.15566 17.4487 6.54407 17.9269 6.26793C18.4052 5.99179 19.0168 6.15566 19.293 6.63396C19.5691 7.11225 19.4052 7.72384 18.9269 7.99998Z"
          fill="currentColor"
        />
      </motion.g>
      <motion.path d={tipD} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <motion.path d={arcD} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
};
