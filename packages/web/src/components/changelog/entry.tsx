import type { ChangelogEntry } from './data';
import { EntryHeader } from './entry-header';
import { ChangeSection } from './section';
import { Timeline } from './timeline';

interface EntryProps {
  isLast: boolean;
  entry: ChangelogEntry;
}

export const Entry = ({ entry, isLast }: EntryProps) => {
  return (
    <div className="relative flex gap-6 sm:gap-10">
      <Timeline isLast={isLast} />
      <div className="min-w-0 flex-1 pb-12 sm:pb-16">
        <EntryHeader date={entry.date} title={entry.title} version={entry.version} />
        <div className="mt-4 flex flex-col gap-4">
          {entry.added ? <ChangeSection label="New" items={entry.added} /> : null}
          {entry.improved ? <ChangeSection label="Improved" items={entry.improved} /> : null}
          {entry.fixed ? <ChangeSection label="Fixed" items={entry.fixed} /> : null}
        </div>
      </div>
    </div>
  );
};
