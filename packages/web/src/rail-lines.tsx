import { INNER_RAIL, OUTER_RAIL } from '@/constants';

export const RailLines = () => {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[100] hidden sm:flex justify-center">
        <div
          data-inner-rail
          style={{ width: `${INNER_RAIL}px` }}
          className="h-full border-l border-r border-dashed border-retro-stone/50"
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[102] hidden sm:flex justify-center">
        <div
          style={{ width: `${OUTER_RAIL}px` }}
          className="h-full border-l border-r border-dashed border-retro-stone/50"
        />
      </div>
    </>
  );
};
