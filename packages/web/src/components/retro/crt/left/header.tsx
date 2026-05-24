export const Header = () => {
  return (
    <div className="flex h-[14px] shrink-0 items-center gap-[2px] border-b border-zinc-200 px-[4px]">
      <span className="flex size-[8px] cursor-pointer items-center justify-center rounded-[2px] bg-zinc-200 text-zinc-600">
        <svg role="presentation" aria-hidden width="6" height="6" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4h12v1H2zm0 3.5h12v1H2zM2 11h12v1H2z" />
        </svg>
      </span>
      <span className="flex size-[8px] cursor-pointer items-center justify-center rounded-[2px] bg-zinc-200 text-zinc-600">
        <svg role="presentation" aria-hidden width="5" height="5" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="3" width="10" height="10" rx="1" />
        </svg>
      </span>
      <span className="flex size-[8px] cursor-pointer items-center justify-center rounded-[2px] bg-zinc-200 text-zinc-600">
        <svg role="presentation" aria-hidden width="5" height="5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 6h10v1H3zm0 3h10v1H3z" />
        </svg>
      </span>
      <span className="ml-auto font-mono text-[4.5px] uppercase tracking-wider text-zinc-900">Chats</span>
    </div>
  );
};
