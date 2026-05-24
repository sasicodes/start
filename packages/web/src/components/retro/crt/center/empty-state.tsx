import { StartMark } from '../../start-mark';

export const EmptyState = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[4px]">
      <span className="flex size-[14px] items-center justify-center rounded-full bg-zinc-100">
        <StartMark className="size-[8px]" />
      </span>
      <span className="font-sans text-[6px] text-zinc-400">Select a chat to view</span>
    </div>
  );
};
