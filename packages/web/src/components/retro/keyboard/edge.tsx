interface KeyboardEdgeProps {
  origin: string;
  gradient: string;
  transform: string;
  position: 'top' | 'bottom';
}

export const KeyboardEdge = ({ origin, gradient, position, transform }: KeyboardEdgeProps) => {
  return (
    <div
      style={{
        background: gradient,
        transformOrigin: origin,
        transform
      }}
      className={`absolute left-0 w-full h-[18px] ${position === 'top' ? 'top-0' : 'bottom-0'}`}
    />
  );
};
