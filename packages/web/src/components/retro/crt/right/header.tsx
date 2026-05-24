export const Header = () => {
  return (
    <div className="flex h-[14px] shrink-0 items-center gap-[2px] border-b border-zinc-200 px-[4px]">
      <span className="flex size-[8px] items-center justify-center rounded-[2px] bg-zinc-200 text-zinc-600">
        <svg role="presentation" aria-hidden width="6" height="6" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3h12v2H2zm0 4h12v6H2z" />
        </svg>
      </span>
      <span className="flex size-[8px] items-center justify-center rounded-[2px] bg-zinc-200 text-zinc-600">
        <svg role="presentation" aria-hidden width="6" height="6" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 2h10v12H3zM5 5h6M5 7h6M5 9h4" />
        </svg>
      </span>
      <span className="ml-auto font-mono text-[4.5px] uppercase tracking-wider text-zinc-900">Files</span>
    </div>
  );
};
