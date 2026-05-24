import { INNER_RAIL } from '@/constants';
import { Footer } from '@/footer';
import { CHANGELOG } from './data';
import { Entry } from './entry';
import { Header } from './header';

export const Changelog = () => {
  return (
    <div className="relative min-h-dvh w-full bg-retro-cream font-sans">
      <div style={{ maxWidth: `${INNER_RAIL}px` }} className="mx-auto px-6 pt-12 pb-0 sm:px-10 sm:pt-20">
        <Header />
        <div className="mt-12 sm:mt-16">
          {CHANGELOG.map((entry, i) => (
            <Entry key={entry.version} entry={entry} isLast={i === CHANGELOG.length - 1} />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};
