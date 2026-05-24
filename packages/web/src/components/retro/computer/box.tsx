interface BoxProps {
  width: number;
  height: number;
  shadow?: string;
  className: string;
  transform: string;
}

export const Box = ({ width, height, shadow, className, transform }: BoxProps) => {
  return <div style={{ width, height, transform, boxShadow: shadow }} className={`absolute ${className}`} />;
};
