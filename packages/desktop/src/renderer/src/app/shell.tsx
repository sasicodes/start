import type { RecentSession } from '@preload/index';
import type { AppSurface } from '@renderer/app/types';
import { DropOverlay } from '@renderer/shared/drop-overlay';
import { SettingsButton } from '@renderer/shared/settings/button';
import { SidePanelLayout } from '@renderer/shared/side-panel/layout';
import { TurnFeed } from '@renderer/shared/turn/feed';
import { GitChangesBadge } from '@renderer/shared/workspace/changes';
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
  sidePanel: ComponentChildren;
  workspacePath: string;
  sidePanelLabel: string;
  mainComposer: ComponentChildren;
  gitPanelVisible: boolean;
  activeSessionId: string;
  sidePanelVisible: boolean;
  activityPanelTurnId: string;
  sessionRoutePending: boolean;
  settingsPanelVisible: boolean;
  onOpenSettings: () => void;
  onToggleGitPanel: () => void;
  onChooseDirectory: () => void;
  onSidePanelCollapse: () => void;
  onSelectWorkspace: (path: string) => void;
  onOpenActivityPanel: (turnId: string) => void;
  onOpenSession: (session: RecentSession) => Promise<boolean>;
}

interface AppShellProps {
  surface: AppSurface;
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
  activityPanelTurnId: string;
  sessionRoutePending: boolean;
  settingsPanelVisible: boolean;
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
    sessionRoutePending,
    settingsPanelVisible,
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
      {!sessionRoutePending && (
        <TurnFeed activityPanelTurnId={activityPanelTurnId} onOpenActivityPanel={onOpenActivityPanel} />
      )}
      <WorkspaceDock
        workspacePath={workspacePath}
        onOpenSession={onOpenSession}
        activeSessionId={activeSessionId}
        onChooseDirectory={onChooseDirectory}
        onSelectWorkspace={onSelectWorkspace}
      />
      <div class="absolute right-4.5 bottom-4.5 z-40 flex h-11.5 items-center gap-2 transition-opacity duration-75 ease-out [-webkit-app-region:no-drag] @max-bottom-controls/chat:pointer-events-none @max-bottom-controls/chat:opacity-0">
        <GitChangesBadge workspacePath={workspacePath} expanded={gitPanelVisible} onTogglePanel={onToggleGitPanel} />
        <SettingsButton active={settingsPanelVisible} onOpenSettings={onOpenSettings} />
      </div>
      {mainComposer}
    </SidePanelLayout>
  )
);

export const AppShell = memo(
  ({
    surface,
    sidePanel,
    mainComposer,
    fileHandlers,
    workspacePath,
    sidePanelLabel,
    overlayComposer,
    gitPanelVisible,
    activeSessionId,
    sidePanelVisible,
    onOpenSession,
    sessionRoutePending,
    settingsPanelVisible,
    onOpenSettings,
    onToggleGitPanel,
    onChooseDirectory,
    onDiscardComposer,
    sessionViewActive,
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
      {surface === 'main' ? (
        <MainSessionSurface
          sidePanel={sidePanel}
          workspacePath={workspacePath}
          sidePanelLabel={sidePanelLabel}
          mainComposer={mainComposer}
          onOpenSession={onOpenSession}
          gitPanelVisible={gitPanelVisible}
          activeSessionId={activeSessionId}
          onOpenSettings={onOpenSettings}
          sessionRoutePending={sessionRoutePending}
          settingsPanelVisible={settingsPanelVisible}
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
    </main>
  )
);
