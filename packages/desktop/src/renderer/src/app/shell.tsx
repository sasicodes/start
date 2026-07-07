import type { RecentSession } from '@preload/index';
import type { AppSurface } from '@renderer/app/types';
import type { SidePanelModeLayout } from '@renderer/app/utils/panel';
import { DropOverlay } from '@renderer/shared/drop-overlay';
import { PanelLayout } from '@renderer/shared/panel/layout';
import { Settings } from '@renderer/shared/settings';
import { TurnFeed } from '@renderer/shared/turn/feed';
import { Update } from '@renderer/shared/updates';
import { GitChanges } from '@renderer/shared/workspace/changes';
import { WorkspaceDock } from '@renderer/shared/workspace/dock';
import type { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';

interface FileDropHandlers {
  dropActive: boolean;
  onDrop: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
}

interface MainSessionSurfaceProps {
  workspacePath: string;
  isGenerating: boolean;
  sidePanelLabel: string;
  activeSessionId: string;
  gitPanelVisible: boolean;
  sidePanelVisible: boolean;
  onOpenSettings: () => void;
  workspaceCollapsed: boolean;
  sidePanel: ComponentChildren;
  sessionRoutePending: boolean;
  onToggleGitPanel: () => void;
  settingsPanelVisible: boolean;
  onChooseDirectory: () => void;
  mainComposer: ComponentChildren;
  onSidePanelCollapse: () => void;
  sidePanelLayout: SidePanelModeLayout;
  onSelectWorkspace: (path: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

interface AppShellProps {
  surface: AppSurface;
  workspacePath: string;
  isGenerating: boolean;
  sidePanelLabel: string;
  activeSessionId: string;
  gitPanelVisible: boolean;
  sidePanelVisible: boolean;
  sessionViewActive: boolean;
  onOpenSettings: () => void;
  workspaceCollapsed: boolean;
  sidePanel: ComponentChildren;
  sessionRoutePending: boolean;
  onToggleGitPanel: () => void;
  settingsPanelVisible: boolean;
  onChooseDirectory: () => void;
  onDiscardComposer: () => void;
  fileHandlers: FileDropHandlers;
  mainComposer: ComponentChildren;
  onSidePanelCollapse: () => void;
  overlayComposer: ComponentChildren;
  sidePanelLayout: SidePanelModeLayout;
  onSelectWorkspace: (path: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

const MainSessionSurface = memo(
  ({
    sidePanel,
    mainComposer,
    isGenerating,
    onOpenSession,
    workspacePath,
    onOpenSettings,
    sidePanelLabel,
    gitPanelVisible,
    activeSessionId,
    sidePanelLayout,
    sidePanelVisible,
    onToggleGitPanel,
    onChooseDirectory,
    onSelectWorkspace,
    workspaceCollapsed,
    sessionRoutePending,
    onSidePanelCollapse,
    settingsPanelVisible
  }: MainSessionSurfaceProps) => (
    <PanelLayout
      sidePanel={sidePanel}
      sidePanelLabel={sidePanelLabel}
      sidePanelVisible={sidePanelVisible}
      onSidePanelCollapse={onSidePanelCollapse}
      {...sidePanelLayout}
    >
      {!sessionRoutePending && <TurnFeed />}
      <WorkspaceDock
        isGenerating={isGenerating}
        workspacePath={workspacePath}
        onOpenSession={onOpenSession}
        activeSessionId={activeSessionId}
        onChooseDirectory={onChooseDirectory}
        onSelectWorkspace={onSelectWorkspace}
        workspaceCollapsed={workspaceCollapsed}
      />
      <div class="absolute right-4.5 bottom-4.5 z-40 flex h-11.5 items-center gap-2 transition-opacity duration-75 ease-out [-webkit-app-region:no-drag] @max-bottom-controls/chat:pointer-events-none @max-bottom-controls/chat:opacity-0">
        <Update />
        <GitChanges path={workspacePath} open={gitPanelVisible} onToggle={onToggleGitPanel} />
        <Settings open={settingsPanelVisible} onOpen={onOpenSettings} />
      </div>
      {mainComposer}
    </PanelLayout>
  )
);

export const AppShell = memo(
  ({
    surface,
    sidePanel,
    mainComposer,
    fileHandlers,
    isGenerating,
    workspacePath,
    onOpenSession,
    sidePanelLabel,
    onOpenSettings,
    overlayComposer,
    gitPanelVisible,
    activeSessionId,
    sidePanelLayout,
    sidePanelVisible,
    onToggleGitPanel,
    onChooseDirectory,
    onDiscardComposer,
    sessionViewActive,
    onSelectWorkspace,
    workspaceCollapsed,
    sessionRoutePending,
    onSidePanelCollapse,
    settingsPanelVisible
  }: AppShellProps) => (
    <main
      aria-label="start"
      {...(sessionViewActive
        ? {
            onDrop: fileHandlers.onDrop,
            onDragOver: fileHandlers.onDragOver,
            onDragEnter: fileHandlers.onDragEnter,
            onDragLeave: fileHandlers.onDragLeave
          }
        : {})}
      {...(surface === 'composer' ? { onMouseDown: onDiscardComposer } : {})}
      class="relative block h-full min-h-screen w-full overflow-hidden bg-transparent"
    >
      {surface === 'main' ? (
        <MainSessionSurface
          sidePanel={sidePanel}
          mainComposer={mainComposer}
          isGenerating={isGenerating}
          workspacePath={workspacePath}
          onOpenSession={onOpenSession}
          onOpenSettings={onOpenSettings}
          sidePanelLabel={sidePanelLabel}
          gitPanelVisible={gitPanelVisible}
          activeSessionId={activeSessionId}
          sidePanelLayout={sidePanelLayout}
          sidePanelVisible={sidePanelVisible}
          onToggleGitPanel={onToggleGitPanel}
          onChooseDirectory={onChooseDirectory}
          onSelectWorkspace={onSelectWorkspace}
          workspaceCollapsed={workspaceCollapsed}
          sessionRoutePending={sessionRoutePending}
          onSidePanelCollapse={onSidePanelCollapse}
          settingsPanelVisible={settingsPanelVisible}
        />
      ) : (
        overlayComposer
      )}
      {sessionViewActive && <DropOverlay visible={fileHandlers.dropActive} />}
    </main>
  )
);
