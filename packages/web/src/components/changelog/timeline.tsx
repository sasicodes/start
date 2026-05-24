interface TimelineProps {
  isLast: boolean;
}

export const Timeline = ({ isLast }: TimelineProps) => {
  return (
    <div className="flex shrink-0 flex-col items-center w-4 pt-1.5">
      <div className="size-2.5 shrink-0 rounded-full border-2 border-retro-stone/60 bg-retro-cream" />
      {!isLast ? <div className="w-px flex-1 border-l border-dashed border-retro-stone/50" /> : null}
    </div>
  );
};
