interface KeyboardSideProps {
  side: 'left' | 'right';
  origin: string;
  gradient: string;
  transform: string;
}

export const KeyboardSide = ({ side, origin, gradient, transform }: KeyboardSideProps) => {
  return (
    <div
      style={{
        background: gradient,
        transformOrigin: origin,
        transform
      }}
      className={`absolute top-0 w-[18px] h-full ${side === 'left' ? 'left-0' : 'right-0'}`}
    />
  );
};
