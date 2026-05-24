interface HeaderProps {
  title: string;
  updated?: string;
  subtitle: string;
}

export const Header = ({ title, updated, subtitle }: HeaderProps) => {
  return (
    <div className="flex flex-col gap-4">
      <a
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
      >
        <svg
          role="presentation"
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 4l-4 4 4 4" />
        </svg>
        Back
      </a>
      <h1 className="text-3xl font-serif font-normal -tracking-[1px] text-zinc-900 sm:text-4xl">{title}</h1>
      <p className="max-w-[520px] text-base leading-relaxed text-neutral-500">{subtitle}</p>
      {updated ? <p className="text-sm text-neutral-500">Last updated {updated}</p> : null}
    </div>
  );
};
