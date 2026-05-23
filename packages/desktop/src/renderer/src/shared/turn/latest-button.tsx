import { latestScrollButtonVisibleState, scrollSessionToBottom } from '@renderer/shared/turn/scroll';
import { ArrowUpIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';

interface LatestButtonProps {
  centered: boolean;
}

export const LatestButton = ({ centered }: LatestButtonProps) => {
  if (centered || !latestScrollButtonVisibleState.value) return null;

  return (
    <div class="pointer-events-none absolute -top-12 inset-x-0 z-10 flex justify-center">
      <Tooltip label="Scroll to latest">
        <button
          type="button"
          onClick={scrollSessionToBottom}
          aria-label="Scroll to latest"
          class="pointer-events-auto grid size-8 place-items-center rounded-full border border-line bg-composer/80 text-soft shadow-shell backdrop-blur-md transition-colors hover:bg-control hover:text-hover focus-visible:bg-control focus-visible:text-hover focus-visible:outline-0"
        >
          <ArrowUpIcon class="size-4 rotate-180" strokeWidth={2} />
        </button>
      </Tooltip>
    </div>
  );
};
