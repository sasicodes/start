import { Computer } from '../computer';

export const Preview = () => {
  return (
    <div style={{ perspective: '2000px' }} className="flex justify-center items-center relative">
      <div className="scale-[0.55] sm:scale-[0.65] lg:scale-[0.80]">
        <Computer />
      </div>
    </div>
  );
};
