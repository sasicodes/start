import type { Tab } from './data';

interface FeatureRowProps {
  isLast: boolean;
  isActive: boolean;
  onActivate: () => void;
  tab: Tab;
}

export const FeatureRow = ({ tab, isLast, isActive, onActivate }: FeatureRowProps) => {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`flex flex-1 cursor-default items-center gap-6 px-4 py-6 text-left sm:px-8 lg:py-0 ${!isLast ? 'border-b border-dashed border-retro-stone/50' : ''}`}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-xl font-normal tracking-tight text-zinc-900 sm:text-2xl lg:text-3xl">
          {tab.title}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateRows: isActive ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.25s ease-out'
          }}
        >
          <div className="overflow-hidden">
            <p className="text-sm leading-relaxed text-neutral-600">{tab.points.join('. ')}.</p>
          </div>
        </div>
      </div>
    </button>
  );
};
