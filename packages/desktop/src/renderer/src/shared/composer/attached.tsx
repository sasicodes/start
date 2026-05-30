import type { ComponentChildren } from 'preact';

interface AttachedProps {
  children: ComponentChildren;
  contentClass?: string;
}

export const Attached = ({ children, contentClass }: AttachedProps) => (
  <div class="absolute right-24 bottom-[calc(100%-0.125rem)] left-24 z-20 origin-bottom overflow-visible rounded-t-2xl bg-composer p-1 shadow-shell [-webkit-app-region:no-drag]">
    <svg aria-hidden="true" class="absolute bottom-0 -left-10 size-10 -scale-x-100 text-composer" viewBox="0 0 40 40">
      <path d="M-1 -1V41H41C8 41 -1 32 -1 -1Z" fill="currentColor" />
    </svg>
    <svg aria-hidden="true" class="absolute -right-10 bottom-0 size-10 text-composer" viewBox="0 0 40 40">
      <path d="M-1 -1V41H41C8 41 -1 32 -1 -1Z" fill="currentColor" />
    </svg>
    <div class={contentClass}>{children}</div>
  </div>
);
