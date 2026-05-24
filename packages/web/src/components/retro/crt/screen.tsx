export const CrtScreen = () => {
  return (
    <div
      className="flex h-[200px] w-[260px] items-center justify-center rounded-2xl bg-retro-bezel"
      style={{
        boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.2), inset -2px -2px 8px rgba(255,255,255,0.5)'
      }}
    >
      <div
        className="crt-scanlines relative h-[182px] w-[242px] overflow-hidden bg-retro-cream"
        style={{
          borderRadius: '40% 40% 40% 40% / 10% 10% 10% 10%',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.15)'
        }}
      >
        <div className="absolute inset-0 z-[2] flex items-center justify-center px-6">
          <div className="flex h-11 w-full items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-2 py-1.5 font-sans shadow-[0_14px_38px_rgba(24,20,12,0.16),0_1px_0_rgba(255,255,255,0.9)_inset]">
            <span className="min-w-0 flex-1 truncate px-2 text-[10px] leading-none text-zinc-400">
              Ask Start to change anything
            </span>
            <button
              type="button"
              aria-label="Send prompt"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-retro-cream shadow-[0_2px_8px_rgba(0,0,0,0.22)]"
            >
              <svg role="presentation" aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none">
                <path
                  d="M8 12V4M8 4 4.75 7.25M8 4l3.25 3.25"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
