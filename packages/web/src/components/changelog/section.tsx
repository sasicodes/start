interface ChangeSectionProps {
  label: string;
  items: string[];
}

export const ChangeSection = ({ label, items }: ChangeSectionProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={`text-xs font-medium ${
          label === 'New'
            ? 'text-emerald-600'
            : label === 'Fixed'
              ? 'text-blue-600'
              : label === 'Improved'
                ? 'text-amber-600'
                : 'text-zinc-500'
        }`}
      >
        {label}
      </span>
      <ul className="flex flex-col gap-1">
        {items.map((text) => (
          <li
            key={text}
            className="relative pl-3 text-sm leading-relaxed text-zinc-700 before:absolute before:top-[9px] before:left-0 before:size-1 before:rounded-full before:bg-neutral-300"
          >
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
};
