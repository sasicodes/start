import { Button } from '@base-ui/react/button';
import { OUTER_RAIL } from '@/constants';
import { useCarousel } from './use-carousel';

const slides = [
  { name: 'Browser', src: '/images/chart-review.webp', alt: 'Start reviewing a chart beside its built-in browser' },
  {
    name: 'Annotate',
    src: '/images/annotation.webp',
    alt: 'Pointing out overlapping chart labels with a browser annotation'
  },
  { name: 'Tabs', src: '/images/browser-and-review.webp', alt: 'Choosing between browser and code review in Start' },
  { name: 'Mentions', src: '/images/mentions.webp', alt: 'Choosing goal, browser, and new-session mentions in Start' },
  { name: 'Files', src: '/images/file-mentions.webp', alt: 'Attaching project files from the composer in dark mode' },
  {
    name: 'Commands',
    src: '/images/commands-dark.webp',
    alt: 'Running project scripts directly from the Start composer'
  },
  { name: 'Models', src: '/images/models-dark.webp', alt: 'Choosing models from OpenAI and Anthropic in dark mode' },
  { name: 'Review', src: '/images/review-dark.webp', alt: 'Reviewing a code diff beside a conversation in dark mode' }
];

export const Showcase = () => {
  const { ref, load, active, paused, setActive, setPaused } = useCarousel(slides.length);

  return (
    <section
      ref={ref}
      aria-label="Start in action"
      aria-roledescription="carousel"
      className="relative z-[101] w-full bg-retro-cream [font-family:system-ui,sans-serif]"
    >
      <div
        style={{ maxWidth: `${OUTER_RAIL}px` }}
        className="mx-auto border-y border-dashed border-retro-stone/50 bg-retro-cream/50 px-4 py-6 sm:px-8 sm:py-8 lg:p-14"
      >
        <div style={{ borderRadius: '1% / 1.6%' }} className="grid overflow-hidden">
          {slides.map((slide, index) => (
            <img
              alt={slide.alt}
              key={slide.src}
              src={slide.src}
              width={3024}
              height={1898}
              loading="lazy"
              decoding="async"
              onLoad={() => load(index)}
              aria-hidden={active !== index}
              style={{ opacity: active === index ? 1 : 0 }}
              className="col-start-1 row-start-1 h-auto w-full transition-opacity duration-300 ease-out motion-reduce:transition-none"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-center sm:mt-3">
          {slides.map((slide, index) => (
            <Button
              key={slide.src}
              aria-label={`Show ${slide.name.toLowerCase()}`}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
              className="group flex h-8 items-center justify-center rounded-sm px-0.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-retro-base"
            >
              <span
                className={`h-0.75 rounded-full bg-retro-base transition-opacity duration-150 ${active === index ? 'w-5 opacity-100' : 'w-2 opacity-25 group-hover:opacity-60'}`}
              />
            </Button>
          ))}
          <Button
            aria-pressed={paused}
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setPaused(!paused)}
            className="sr-only rounded-sm text-xs text-stone-700 focus:not-sr-only focus:px-2 focus:py-1"
          >
            {paused ? 'Play slideshow' : 'Pause slideshow'}
          </Button>
        </div>
      </div>
    </section>
  );
};
