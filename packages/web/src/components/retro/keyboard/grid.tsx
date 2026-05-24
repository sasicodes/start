import { KeyCap } from './cap';

const TOP_ROW_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HOME_ROW_KEYS = [13, 14, 15, 16, 17, 18, 19, 20];

export const KeyGrid = () => {
  return (
    <div
      className="grid gap-1.5 p-4"
      style={{
        gridTemplateColumns: 'repeat(12, 1fr)',
        transform: 'translateZ(8px)',
        transformStyle: 'preserve-3d'
      }}
    >
      {TOP_ROW_KEYS.map((index) => (
        <KeyCap key={`top-${index}`} index={index} />
      ))}

      <KeyCap index={12} span="col-span-2" />
      {HOME_ROW_KEYS.map((index) => (
        <KeyCap key={`home-${index}`} index={index} />
      ))}
      <KeyCap index={21} span="col-span-2" />
      <KeyCap index={22} />
      <KeyCap index={23} />
      <KeyCap index={24} span="col-span-6" />
      <KeyCap index={25} />
      <KeyCap index={26} />
      <KeyCap index={27} />
    </div>
  );
};
