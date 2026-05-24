import { StartMark } from '../../start-mark';

export const ProjectHeader = () => {
  return (
    <div className="flex items-center gap-[3px] px-[5px] py-[3px]">
      <StartMark className="size-[6px] shrink-0" />
      <span className="flex-1 truncate font-mono text-[4.5px] uppercase tracking-wider text-zinc-500">start</span>
      <span className="flex size-[8px] shrink-0 items-center justify-center text-zinc-400">
        <svg role="presentation" aria-hidden width="5" height="5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3v10M3 8h10" strokeWidth="1.5" />
        </svg>
      </span>
    </div>
  );
};
