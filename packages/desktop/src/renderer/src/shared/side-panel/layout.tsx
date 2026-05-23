import { SidePanelFrame } from '@renderer/shared/side-panel/frame';
import { useSidePanelResize } from '@renderer/shared/side-panel/resize';
import type { SidePanelLayoutProps } from '@renderer/shared/side-panel/types';
import { defaultMaxSidePanelWidthRatio } from '@renderer/shared/side-panel/width';

const defaultSidePanelWidth = 480;
const defaultMinSidePanelWidthRatio = 0.3;

export const SidePanelLayout = ({
  children,
  sidePanel,
  sidePanelLabel,
  sidePanelVisible,
  onSidePanelCollapse,
  maxSidePanelWidthRatio = defaultMaxSidePanelWidthRatio,
  minSidePanelWidthRatio = defaultMinSidePanelWidthRatio,
  defaultSidePanelWidth: fallbackWidth = defaultSidePanelWidth
}: SidePanelLayoutProps) => {
  const { rootRef, resizing, settling, startResize, initialWidth } = useSidePanelResize({
    fallbackWidth,
    sidePanelVisible,
    maxSidePanelWidthRatio,
    minSidePanelWidthRatio,
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
