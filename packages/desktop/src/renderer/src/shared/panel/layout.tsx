import { PanelFrame } from '@renderer/shared/panel/frame';
import { usePanelResize } from '@renderer/shared/panel/resize';
import type { PanelLayoutProps } from '@renderer/shared/panel/types';
import { defaultMaxPanelWidthRatio } from '@renderer/shared/panel/width';

const defaultPanelWidth = 480;
const defaultMinPanelWidthRatio = 0.3;

export const PanelLayout = ({
  children,
  sidePanel,
  sidePanelLabel,
  sidePanelVisible,
  onSidePanelCollapse,
  maxSidePanelWidthRatio = defaultMaxPanelWidthRatio,
  minSidePanelWidthRatio = defaultMinPanelWidthRatio,
  defaultSidePanelWidth: fallbackWidth = defaultPanelWidth
}: PanelLayoutProps) => {
  const { rootRef, resizing, settling, startResize, initialWidth } = usePanelResize({
    fallbackWidth,
    sidePanelVisible,
    maxSidePanelWidthRatio,
    minSidePanelWidthRatio,
    ...(onSidePanelCollapse ? { onSidePanelCollapse } : {})
  });

  return (
    <div ref={rootRef} class="absolute inset-0 flex min-h-0 overflow-hidden">
      <div class="@container/chat relative min-w-0 flex-1">
        <div aria-hidden="true" class="absolute inset-x-0 top-0 z-60 h-7 [-webkit-app-region:drag]" />
        {children}
      </div>
      <PanelFrame
        label={sidePanelLabel}
        visible={sidePanelVisible}
        resizing={resizing}
        settling={settling}
        initialWidth={initialWidth}
        onResizePointerDown={startResize}
      >
        {sidePanel}
      </PanelFrame>
    </div>
  );
};
