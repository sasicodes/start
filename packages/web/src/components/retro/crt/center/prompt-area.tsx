export const PromptArea = () => {
  return (
    <div className="px-[6px] pb-[5px]">
      <div className="rounded-[6px] border border-zinc-200 bg-zinc-50/60">
        <div className="p-[1px]">
          <div className="rounded-[5px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="min-h-[16px] px-[5px] pt-[4px] pb-[2px]">
              <span className="font-sans text-[5px] text-zinc-400">Ask to plan or work on something</span>
            </div>
            <div className="flex items-center justify-between px-[4px] pb-[3px]">
              <div className="flex items-center gap-[2px]">
                <span className="flex size-[8px] items-center justify-center rounded-[2px] text-zinc-400">
                  <svg role="presentation" aria-hidden width="5" height="5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </span>
                <span className="flex size-[8px] items-center justify-center rounded-[2px] text-zinc-400">
                  <svg role="presentation" aria-hidden width="5" height="5" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="5" />
                  </svg>
                </span>
              </div>
              <span className="flex size-[9px] items-center justify-center rounded-full bg-zinc-900">
                <svg
                  role="presentation"
                  aria-hidden
                  width="5"
                  height="5"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="text-white"
                >
                  <path d="M3 8l5-5v3h5v4H8v3z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
