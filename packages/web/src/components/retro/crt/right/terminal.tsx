export const Terminal = () => {
  return (
    <div className="border-t border-zinc-200">
      <div className="flex h-[14px] shrink-0 items-center bg-zinc-100/80">
        <span className="flex h-full items-center bg-white px-[4px] font-mono text-[4.5px] uppercase tracking-wider text-zinc-700">
          Term 1
        </span>
        <span className="flex h-full items-center px-[4px] font-mono text-[4.5px] uppercase tracking-wider text-zinc-400">
          Term 2
        </span>
      </div>
      <div className="h-[42px] overflow-hidden bg-zinc-50/60 px-[3px] py-[3px]">
        <div className="flex flex-col font-mono text-[4.5px] leading-[1.4]">
          <div>
            <span className="text-zinc-400">❯ </span>
            <span className="text-zinc-700">pnpm dev</span>
          </div>
          <div className="text-zinc-400">VITE v6.3.1 ready in 148ms</div>
          <div className="text-zinc-400">
            ➜ Local: <span className="text-zinc-500">localhost:3000</span>
          </div>
          <div className="mt-[1px] text-zinc-400">12:04:31 hmr /app/dashboard/overview.tsx</div>
          <div className="text-zinc-400">12:05:12 hmr /app/settings/profile.ts</div>
        </div>
      </div>
    </div>
  );
};
