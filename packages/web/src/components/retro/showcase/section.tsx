import { useState } from 'react';
import { OUTER_RAIL } from '@/constants';
import { TABS } from './data';
import { DragHandles } from './drag-handles';
import { FeatureRow } from './row';

export const Showcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = TABS[activeIndex];

  return (
    <section className="relative z-[101] w-full bg-retro-cream font-sans">
      <div
        style={{ maxWidth: `${OUTER_RAIL}px` }}
        className="mx-auto flex flex-col border-y border-dashed border-retro-stone/50 bg-retro-cream/50 lg:flex-row"
      >
        <div className="flex flex-1 flex-col lg:h-[860px]">
          {TABS.map((tab, i) => (
            <FeatureRow
              key={tab.id}
              tab={tab}
              isActive={i === activeIndex}
              isLast={i === TABS.length - 1}
              onActivate={() => setActiveIndex(i)}
            />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center border-t border-dashed border-retro-stone/50 lg:border-l lg:border-t-0">
          <div className="relative w-full lg:h-[720px] lg:w-[720px]">
            <div className="flex h-full w-full items-center justify-center p-8 lg:p-12">
              <img
                src={activeTab.image}
                alt={activeTab.title}
                width={1024}
                height={1024}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="aspect-square w-full rounded-2xl object-cover"
              />
            </div>
            <DragHandles />
          </div>
        </div>
      </div>
    </section>
  );
};
