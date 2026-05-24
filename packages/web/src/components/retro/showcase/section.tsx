import { OUTER_RAIL } from '@/constants';

export const Showcase = () => {
  return (
    <section className="relative z-[101] w-full bg-retro-cream font-sans">
      <div
        style={{ maxWidth: `${OUTER_RAIL}px` }}
        className="mx-auto border-y border-dashed border-retro-stone/50 bg-retro-cream/50 p-6 sm:p-10 lg:p-14"
      >
        <img
          src="/images/1.png"
          alt="Start workspace screenshot"
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="aspect-video w-full rounded-2xl object-cover shadow-[0_24px_80px_rgba(33,28,18,0.12)]"
        />
      </div>
    </section>
  );
};
