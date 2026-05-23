import type { ImageAttachment } from '@preload/index';

const ClearIcon = () => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" class="size-2.5" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4.75 4.75L19.25 19.25M19.25 4.75L4.75 19.25"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1.5"
    />
  </svg>
);

export const Attachments = ({
  attachments,
  onOpenAttachment,
  onRemoveAttachment
}: {
  attachments: ImageAttachment[];
  onOpenAttachment: (path: string) => void;
  onRemoveAttachment: (id: string) => void;
}) => {
  if (attachments.length === 0) return null;

  const visibleAttachments = attachments.slice(0, 4);
  const overflowCount = attachments.length - visibleAttachments.length;

  return (
    <div class="flex h-9.5 items-center rounded-full bg-control p-0.5">
      <div class="flex items-center -space-x-1.5">
        {visibleAttachments.map((attachment, index) => (
          <div
            key={attachment.id}
            style={{ zIndex: visibleAttachments.length - index }}
            class="group/attachment relative size-8.5"
          >
            <button
              type="button"
              aria-label={`Open ${attachment.name}`}
              onClick={() => onOpenAttachment(attachment.path)}
              onDragStart={(event) => event.preventDefault()}
              class="grid size-8.5 place-items-center overflow-hidden rounded-full border-0 bg-composer p-0 select-none hover:opacity-90 focus-visible:opacity-90 focus-visible:outline-0"
            >
              <img alt="" draggable={false} src={attachment.previewUrl} class="size-full object-cover" />
            </button>
            <button
              type="button"
              aria-label={`Remove ${attachment.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveAttachment(attachment.id);
              }}
              class="absolute top-0 right-0 z-10 grid size-4.5 translate-x-1/4 -translate-y-1/4 place-items-center rounded-full border-0 bg-composer p-0.5 text-ink opacity-0 shadow-nav transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-0 group-hover/attachment:opacity-100"
            >
              <ClearIcon />
            </button>
          </div>
        ))}
        {overflowCount > 0 && (
          <span class="relative grid size-8.5 place-items-center rounded-full bg-composer text-[11px] leading-none font-semibold text-ink">
            +{overflowCount}
          </span>
        )}
      </div>
    </div>
  );
};
