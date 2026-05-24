const VENT_CELLS = [
  'top-left',
  'top-mid-left',
  'top-mid-right',
  'top-right',
  'bottom-left',
  'bottom-mid-left',
  'bottom-mid-right',
  'bottom-right'
];

export const VentGrille = () => {
  return (
    <div className="absolute right-[25px] bottom-[25px] grid h-5 w-[30px] grid-cols-4 gap-0.5">
      {VENT_CELLS.map((cell) => (
        <div
          key={cell}
          style={{ boxShadow: 'inset 1px 1px 1px rgba(0,0,0,0.5)' }}
          className="rounded-[1px] bg-neutral-800"
        />
      ))}
    </div>
  );
};
