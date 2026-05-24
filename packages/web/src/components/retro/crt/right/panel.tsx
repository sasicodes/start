import { FILE_TREE } from '../data';
import { FileTreeRow } from './file-tree-row';
import { Header } from './header';
import { Terminal } from './terminal';

export const RightSidebar = () => {
  return (
    <div className="flex h-full w-[68px] shrink-0 flex-col bg-zinc-50/80 font-sans">
      <Header />
      <div className="flex flex-1 flex-col gap-[1px] overflow-hidden px-[3px] py-[2px]">
        {FILE_TREE.map((item) => (
          <FileTreeRow key={`${item.depth}-${item.name}`} {...item} />
        ))}
      </div>
      <Terminal />
    </div>
  );
};
