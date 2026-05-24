interface BoxFaceProps {
  width: number;
  height: number;
  shadow?: string;
  className: string;
  transform: string;
}

export const BoxFace = ({ width, height, shadow, className, transform }: BoxFaceProps) => {
  return <div style={{ width, height, transform, boxShadow: shadow }} className={`absolute ${className}`} />;
};
