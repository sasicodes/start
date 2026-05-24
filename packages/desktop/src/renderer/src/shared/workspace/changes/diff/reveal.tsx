import { revealLabel } from '@renderer/shared/workspace/changes/diff/reveal-label';

export const Reveal = ({ cwd, filePath }: { cwd: string; filePath: string }) => {
  if (!cwd || !filePath) return null;

  return (
    <button
      type="button"
      onClick={() => void window.pi.app.revealPath(cwd, filePath).catch(() => {})}
      class="rounded-full border-0 bg-transparent px-2 py-1 text-xs leading-none font-medium text-soft transition-colors hover:text-hover"
    >
      {revealLabel(window.pi.app.platform)}
    </button>
  );
};
