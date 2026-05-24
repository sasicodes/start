export const Footer = () => {
  return (
    <footer className="border-y border-dashed border-retro-stone/50 z-20">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-8 mx-8 text-neutral-600 font-sans text-sm">
        <span>
          {new Date().getFullYear()} &copy; Made by{' '}
          <a
            href="https://x.com/sasicodes"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-900"
          >
            Sasi
          </a>
        </span>
        <span>·</span>
        <a href="/changelog" className="hover:text-neutral-900 transition-colors">
          Changelog
        </a>
        <span>·</span>
        <a href="/terms" className="hover:text-neutral-900 transition-colors">
          Terms
        </a>
        <span>·</span>
        <a href="/privacy" className="hover:text-neutral-900 transition-colors">
          Privacy
        </a>
      </div>
    </footer>
  );
};
