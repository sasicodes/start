import { attachedPanelTransition } from '@renderer/ui/motion';
import { motion } from 'motion/react';
import type { ComponentChildren } from 'preact';

interface ComposerAttachedPanelProps {
  children: ComponentChildren;
  contentClass?: string;
}

export const ComposerAttachedPanel = ({ children, contentClass }: ComposerAttachedPanelProps) => (
  <div class="absolute right-24 bottom-[calc(100%-0.125rem)] left-24 z-20 overflow-visible [-webkit-app-region:no-drag]">
    <svg aria-hidden="true" class="absolute -bottom-px -left-10 size-10 -scale-x-100 text-composer" viewBox="0 0 40 40">
      <path d="M0 0V40H40C8 40 0 32 0 0Z" fill="currentColor" />
    </svg>
    <svg aria-hidden="true" class="absolute -right-10 -bottom-px size-10 text-composer" viewBox="0 0 40 40">
      <path d="M0 0V40H40C8 40 0 32 0 0Z" fill="currentColor" />
    </svg>
    <motion.div
      class="relative overflow-hidden rounded-t-2xl bg-composer p-1 shadow-shell"
      layout="size"
      transition={attachedPanelTransition}
    >
      <motion.div class={contentClass} layout="position">
        {children}
      </motion.div>
    </motion.div>
  </div>
);
