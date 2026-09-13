import { Computer } from '../computer';

export const Preview = () => {
  return (
    <div
      style={{ perspective: '2000px' }}
      className="relative flex h-80 items-center justify-center sm:h-96 lg:h-[440px]"
    >
      <div className="scale-[0.55] sm:scale-[0.65] lg:scale-[0.80]">
        <Computer />
      </div>
    </div>
  );
};
