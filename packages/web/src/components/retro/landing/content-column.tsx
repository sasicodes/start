import { DownloadButton } from './download-button';

export const ContentColumn = () => {
  return (
    <div className="text-center text-zinc-950 shrink-0 pt-10 sm:pt-0">
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-4 sm:mb-6 -tracking-[2px] font-normal text-zinc-950 whitespace-nowrap">
        Agents have a <em>home now</em>
        <span className="text-zinc-400">.</span>
      </h1>

      <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-snug mb-5 sm:mb-10 max-w-[640px] font-serif -tracking-wide text-neutral-600 mx-auto">
        Your coding assistant.
      </p>

      <div className="flex flex-row gap-4 items-center justify-center">
        <DownloadButton />
      </div>
    </div>
  );
};
