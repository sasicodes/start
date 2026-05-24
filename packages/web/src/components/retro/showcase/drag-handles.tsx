const HANDLE_OFFSET = 12;

export const DragHandles = () => (
  <div className="pointer-events-none absolute inset-0">
    <div
      style={{
        top: HANDLE_OFFSET,
        left: HANDLE_OFFSET
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        top: HANDLE_OFFSET,
        right: HANDLE_OFFSET
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        bottom: HANDLE_OFFSET,
        left: HANDLE_OFFSET
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        bottom: HANDLE_OFFSET,
        right: HANDLE_OFFSET
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        top: HANDLE_OFFSET,
        left: '50%',
        transform: 'translateX(-50%)'
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        bottom: HANDLE_OFFSET,
        left: '50%',
        transform: 'translateX(-50%)'
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        left: HANDLE_OFFSET,
        top: '50%',
        transform: 'translateY(-50%)'
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
    <div
      style={{
        right: HANDLE_OFFSET,
        top: '50%',
        transform: 'translateY(-50%)'
      }}
      className="absolute size-2 rounded-full border border-retro-stone/40 bg-white"
    />
  </div>
);
