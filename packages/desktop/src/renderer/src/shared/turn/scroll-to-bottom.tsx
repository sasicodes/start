import { scrollSessionToBottom, scrollToBottomButtonState } from '@renderer/shared/turn/scroll';
import { ArrowUpIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';

export const ScrollToBottom = () => {
  if (!scrollToBottomButtonState.value) return null;

  return (
    <div class="pointer-events-none absolute -top-12 inset-x-0 z-10 flex justify-center">
      <Tooltip label="Scroll to latest">
        <button
          type="button"
          aria-label="Scroll to latest"
          onClick={scrollSessionToBottom}
          class="pointer-events-auto grid size-8 place-items-center rounded-full border-0 bg-composer text-soft shadow-shell transition-colors hover:bg-control hover:text-hover focus-visible:bg-control focus-visible:text-hover focus-visible:outline-0"
        >
          <ArrowUpIcon strokeWidth={2} class="size-4 rotate-180" />
        </button>
      </Tooltip>
    </div>
  );
};
