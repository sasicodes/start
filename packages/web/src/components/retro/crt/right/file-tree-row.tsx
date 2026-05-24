interface FileTreeRowProps {
  name: string;
  depth: number;
  isDir: boolean;
  isOpen: boolean;
}

export const FileTreeRow = ({ name, depth, isDir, isOpen }: FileTreeRowProps) => {
  const indent = 3 + depth * 7;
  return (
    <div
      style={{ paddingLeft: indent }}
      className="flex items-center gap-[2px] py-[1px] text-zinc-500 hover:text-zinc-700"
    >
      {isDir ? (
        isOpen ? (
          <svg
            role="presentation"
            aria-hidden="true"
            width="6"
            height="6"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="shrink-0 text-zinc-500"
          >
            <path d="M2 4h5l1 2h6v7H2z" />
          </svg>
        ) : (
          <svg
            role="presentation"
            aria-hidden="true"
            width="6"
            height="6"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="shrink-0 text-zinc-400"
          >
            <path d="M2 4h5l1 2h6v7H2z" />
          </svg>
        )
      ) : (
        <svg
          role="presentation"
          aria-hidden="true"
          width="6"
          height="6"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="shrink-0 text-zinc-300"
        >
          <path d="M4 2h5l3 3v9H4z" />
        </svg>
      )}
      <span className={`truncate font-mono text-[5.5px] leading-none ${isDir ? 'text-zinc-700' : 'text-zinc-400'}`}>
        {name}
      </span>
    </div>
  );
};
