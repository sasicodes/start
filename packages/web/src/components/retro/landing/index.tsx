import { DiagramOverlay } from '../diagram';
import { Content } from './content';

export const Landing = () => {
  return (
    <div className="flex w-full items-center justify-center overflow-x-clip bg-retro-cream">
      <div className="flex w-full max-w-[960px] flex-col items-center justify-center gap-8 px-4 sm:gap-12 sm:px-12 lg:gap-16">
        <Content />
        <DiagramOverlay />
      </div>
    </div>
  );
};
