interface EntryHeaderProps {
  date: string;
  title: string;
  version: string;
}

export const EntryHeader = ({ date, title, version }: EntryHeaderProps) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-xs text-zinc-600">{version}</span>
        <span className="text-neutral-300">·</span>
        <span className="text-xs text-zinc-500">{date}</span>
      </div>
      <h2 className="text-lg font-semibold -tracking-[0.5px] text-zinc-900">{title}</h2>
    </div>
  );
};
