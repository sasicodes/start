import { Download } from './download';

export const Content = () => {
  return (
    <div className="text-center text-zinc-950 shrink-0 pt-6 sm:pt-0">
      <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-6 sm:mb-8 font-normal text-zinc-950 whitespace-normal sm:whitespace-nowrap">
        Start, <em>your</em> coding assistant
        <span className="text-zinc-400">.</span>
      </h1>

      <div className="flex flex-row gap-4 items-center justify-center">
        <Download />
      </div>
    </div>
  );
};
