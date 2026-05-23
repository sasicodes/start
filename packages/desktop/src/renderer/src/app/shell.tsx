import type { RecentSession } from '@preload/index';
import type { AppSurface } from '@renderer/app/types';
import { DebugToolbar } from '@renderer/shared/debug';
import { DropOverlay } from '@renderer/shared/drop-overlay';
import { SettingsButton } from '@renderer/shared/settings/button';
import { SidePanelLayout } from '@renderer/shared/side-panel/layout';
import { TurnFeed } from '@renderer/shared/turn/feed';
import { GitChangesBadge } from '@renderer/shared/workspace/changes';
import { WorkspaceDock } from '@renderer/shared/workspace/dock';
import type { AppRoute } from '@renderer/utils/route';
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
  sidePanel: ComponentChildren;
  workspacePath: string;
  sidePanelLabel: string;
  mainComposer: ComponentChildren;
  gitPanelVisible: boolean;
  activeSessionId: string;
  sidePanelVisible: boolean;
  activityPanelTurnId: string;
  onOpenSettings: () => void;
  onToggleGitPanel: () => void;
  onChooseDirectory: () => void;
  onSidePanelCollapse: () => void;
  onSelectWorkspace: (path: string) => void;
  onOpenActivityPanel: (turnId: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

interface AppShellProps {
  route: AppRoute;
  surface: AppSurface;
  settingsView: ComponentChildren;
  sidePanel: ComponentChildren;
  mainComposer: ComponentChildren;
  overlayComposer: ComponentChildren;
  fileHandlers: FileDropHandlers;
  workspacePath: string;
  sidePanelLabel: string;
  gitPanelVisible: boolean;
  activeSessionId: string;
  sessionViewActive: boolean;
  sidePanelVisible: boolean;
  debugToolbarVisible: boolean;
  activityPanelTurnId: string;
  onOpenSettings: () => void;
  onToggleGitPanel: () => void;
  onChooseDirectory: () => void;
  onDiscardComposer: () => void;
  onSidePanelCollapse: () => void;
  onSelectWorkspace: (path: string) => void;
  onOpenActivityPanel: (turnId: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

const MainSessionSurface = memo(
  ({
    sidePanel,
    workspacePath,
    sidePanelLabel,
    mainComposer,
    gitPanelVisible,
    activeSessionId,
    sidePanelVisible,
    activityPanelTurnId,
    onOpenSettings,
    onToggleGitPanel,
    onChooseDirectory,
    onSidePanelCollapse,
    onSelectWorkspace,
    onOpenActivityPanel,
    onOpenSession
  }: MainSessionSurfaceProps) => (
    <SidePanelLayout
      sidePanel={sidePanel}
      sidePanelLabel={sidePanelLabel}
      sidePanelVisible={sidePanelVisible}
      onSidePanelCollapse={onSidePanelCollapse}
    >
      <TurnFeed activityPanelTurnId={activityPanelTurnId} onOpenActivityPanel={onOpenActivityPanel} />
      <WorkspaceDock
        workspacePath={workspacePath}
        onOpenSession={onOpenSession}
        activeSessionId={activeSessionId}
        onChooseDirectory={onChooseDirectory}
        onSelectWorkspace={onSelectWorkspace}
      />
      <GitChangesBadge workspacePath={workspacePath} expanded={gitPanelVisible} onTogglePanel={onToggleGitPanel} />
      <SettingsButton onOpenSettings={onOpenSettings} />
      {mainComposer}
    </SidePanelLayout>
  )
);

export const AppShell = memo(
  ({
    route,
    surface,
    sidePanel,
    settingsView,
    mainComposer,
    fileHandlers,
    workspacePath,
    sidePanelLabel,
    overlayComposer,
    gitPanelVisible,
    activeSessionId,
    sidePanelVisible,
    onOpenSession,
    onOpenSettings,
    onToggleGitPanel,
    onChooseDirectory,
    onDiscardComposer,
    sessionViewActive,
    debugToolbarVisible,
    activityPanelTurnId,
    onSelectWorkspace,
    onSidePanelCollapse,
    onOpenActivityPanel
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
      {surface === 'main' && (
        <div aria-hidden="true" class="absolute inset-x-0 top-0 z-60 h-7 [-webkit-app-region:drag]" />
      )}
      {route.name === 'settings' ? (
        settingsView
      ) : surface === 'main' ? (
        <MainSessionSurface
          sidePanel={sidePanel}
          workspacePath={workspacePath}
          sidePanelLabel={sidePanelLabel}
          mainComposer={mainComposer}
          onOpenSession={onOpenSession}
          gitPanelVisible={gitPanelVisible}
          activeSessionId={activeSessionId}
          onOpenSettings={onOpenSettings}
          onToggleGitPanel={onToggleGitPanel}
          sidePanelVisible={sidePanelVisible}
          onChooseDirectory={onChooseDirectory}
          onSelectWorkspace={onSelectWorkspace}
          activityPanelTurnId={activityPanelTurnId}
          onOpenActivityPanel={onOpenActivityPanel}
          onSidePanelCollapse={onSidePanelCollapse}
        />
      ) : (
        overlayComposer
      )}
      {sessionViewActive && <DropOverlay visible={fileHandlers.dropActive} />}
      {debugToolbarVisible && surface === 'main' && <DebugToolbar />}
    </main>
  )
);
