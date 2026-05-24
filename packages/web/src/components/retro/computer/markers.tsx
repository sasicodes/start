export const MARKER_POSITIONS = [
  { x: 70, y: 80 },
  { x: 65, y: 140 },
  { x: 160, y: 200 },
  { x: 110, y: 320 },
  { x: 270, y: 75 },
  { x: 270, y: 115 },
  { x: 250, y: 195 },
  { x: 280, y: 330 }
];

export const AnnotationMarkers = () => {
  return (
    <>
      {MARKER_POSITIONS.map((pos, i) => (
        <div
          key={`marker-${pos.x}-${pos.y}`}
          data-annotation-marker={i}
          className="absolute pointer-events-none"
          style={{ left: pos.x, top: pos.y, width: 1, height: 1 }}
        />
      ))}
    </>
  );
};
