import { SidePanelFrame } from '@renderer/shared/side-panel/frame';
import { useSidePanelResize } from '@renderer/shared/side-panel/resize';
import type { SidePanelLayoutProps } from '@renderer/shared/side-panel/types';

const defaultMinSidePanelWidth = 320;
const defaultSidePanelWidth = 480;

export const SidePanelLayout = ({
  children,
  sidePanel,
  sidePanelLabel,
  sidePanelVisible,
  onSidePanelCollapse,
  maxSidePanelWidth,
  minSidePanelWidth = defaultMinSidePanelWidth,
  defaultSidePanelWidth: fallbackWidth = defaultSidePanelWidth
}: SidePanelLayoutProps) => {
  const { initialWidth, resizing, rootRef, settling, startResize } = useSidePanelResize({
    fallbackWidth,
    minSidePanelWidth,
    sidePanelVisible,
    ...(maxSidePanelWidth ? { maxSidePanelWidth } : {}),
    ...(onSidePanelCollapse ? { onSidePanelCollapse } : {})
  });

  return (
    <div ref={rootRef} class="absolute inset-0 flex min-h-0 overflow-hidden">
      <div class="@container/chat relative min-w-0 flex-1">{children}</div>
      <SidePanelFrame
        label={sidePanelLabel}
        visible={sidePanelVisible}
        resizing={resizing}
        settling={settling}
        initialWidth={initialWidth}
        onResizePointerDown={startResize}
      >
        {sidePanel}
      </SidePanelFrame>
    </div>
  );
};
