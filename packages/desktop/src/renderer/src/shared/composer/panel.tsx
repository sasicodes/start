import type { ComponentChildren } from 'preact';

interface ComposerAttachedPanelProps {
  children: ComponentChildren;
  contentClass?: string;
}

export const ComposerAttachedPanel = ({ children, contentClass }: ComposerAttachedPanelProps) => (
  <div class="absolute right-24 bottom-[calc(100%-0.125rem)] left-24 z-20 origin-bottom overflow-visible rounded-t-2xl bg-composer p-1 shadow-shell [-webkit-app-region:no-drag]">
    <svg aria-hidden="true" class="absolute bottom-px -left-10 size-10 -scale-x-100 text-composer" viewBox="0 0 40 40">
      <path d="M0 0V40H40C8 40 0 32 0 0Z" fill="currentColor" />
    </svg>
    <svg aria-hidden="true" class="absolute -right-10 bottom-px size-10 text-composer" viewBox="0 0 40 40">
      <path d="M0 0V40H40C8 40 0 32 0 0Z" fill="currentColor" />
    </svg>
    <div class={contentClass}>{children}</div>
  </div>
);
