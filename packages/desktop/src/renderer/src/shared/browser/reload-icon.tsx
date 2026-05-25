import { motion } from 'motion/react';

interface BrowserReloadIconProps {
  loading: boolean;
}

const iconTransition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] } as const;

export const BrowserReloadIcon = ({ loading }: BrowserReloadIconProps) => (
  <span class="relative grid size-4 place-items-center">
    <motion.svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      animate={{ opacity: loading ? 0 : 1, rotate: loading ? 90 : 0, scale: loading ? 0.9 : 1 }}
      transition={iconTransition}
      class="absolute size-4 origin-center"
    >
      <motion.path
        d="M18.25 8.75V4.75H14.25"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <motion.path
        d="M17.25 6.75C15.95 4.93 13.82 3.75 11.42 3.75C7.45 3.75 4.25 6.95 4.25 10.92C4.25 14.89 7.45 18.09 11.42 18.09C14.45 18.09 17.05 16.21 18.1 13.55"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </motion.svg>
    <motion.svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      animate={{ opacity: loading ? 1 : 0, rotate: loading ? 0 : -90, scale: loading ? 1 : 0.9 }}
      transition={iconTransition}
      class="absolute size-4 origin-center"
    >
      <motion.path
        d="M6.75 6.75L17.25 17.25M17.25 6.75L6.75 17.25"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </motion.svg>
  </span>
);
