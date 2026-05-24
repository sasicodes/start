import { DiagramOverlay } from '../diagram';
import { ContentColumn } from './content-column';

export const RetroLanding = () => {
  return (
    <div className="w-full h-full bg-retro-cream flex items-center justify-center overflow-x-clip">
      <div className="w-full max-w-[960px] h-full flex flex-col items-center justify-center gap-6 sm:gap-16 px-4 sm:px-12 py-0 sm:py-12 lg:py-16">
        <ContentColumn />
        <DiagramOverlay />
      </div>
    </div>
  );
};
