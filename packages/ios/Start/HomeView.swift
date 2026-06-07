import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var searchFocused: Bool
    @State private var scannerOpen = false
    @State private var connectionsOpen = false
    @State private var expandedWorkspaces = Set<String>()
    @State private var scannerPendingAfterConnections = false
    @State private var workspaceExpansionInitialized = false
    @State private var sort = WorkspaceSort.recent
    let transitionNamespace: Namespace.ID

    var body: some View {
        @Bindable var appState = appState
        let searchActive = searchFocused || !appState.searchText.isEmpty
        let hasConnections = !appState.connections.isEmpty
        let connectionEnabled = appState.activeConnection?.enabled == true

        return GeometryReader { geometry in
            ScrollView(showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 16) {
                    titleRow

                    contentList(minHeight: emptyStateHeight(in: geometry.size.height))
                }
                .padding(.horizontal, StartTheme.Metrics.pagePadding)
                .padding(.bottom, StartTheme.Metrics.homeListBottomPadding)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .overlay {
            if connectionEnabled {
                connectedBottomControls(searchActive: searchActive, searchText: $appState.searchText)
            } else if hasConnections {
                connectionsBottomButton
            } else {
                addConnectionBottomButton
            }
        }
        .refreshable {
            await appState.refreshChats()
            StartHaptics.lightImpact()
        }
        .animation(.easeOut(duration: 0.16), value: appState.sessionLoadStateKey)
        .sheet(isPresented: $scannerOpen) {
            ConnectionScannerSheet()
        }
        .sheet(isPresented: $connectionsOpen, onDismiss: openPendingScanner) {
            ConnectionsSheet(
                connections: appState.connections,
                activeConnectionID: appState.activeConnectionID,
                onAddConnection: {
                    scannerPendingAfterConnections = true
                    connectionsOpen = false
                },
                onDeleteConnection: appState.deleteConnection,
                onRenameConnection: appState.renameConnection,
                connectionState: { appState.connectionState(for: $0) },
                onSelectConnection: appState.selectConnection,
                onSetConnectionEnabled: appState.setConnectionEnabled
            )
        }
        .task {
            appState.connectActiveConnectionIfNeeded()
        }
        .onChange(of: appState.chats.map(\.workspacePath)) { _, paths in
            guard !workspaceExpansionInitialized, let first = paths.first else { return }
            workspaceExpansionInitialized = true
            expandedWorkspaces = [first]
        }
        .onChange(of: appState.activeConnectionID) {
            workspaceExpansionInitialized = false
            expandedWorkspaces = []
        }
    }

    private var visibleChats: [Chat] {
        let query = appState.searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return appState.chats }

        return appState.chats.filter { chat in
            chat.title.localizedCaseInsensitiveContains(query)
                || chat.projectName.localizedCaseInsensitiveContains(query)
                || chat.branchName.localizedCaseInsensitiveContains(query)
        }
    }

    private func emptyStateHeight(in height: CGFloat) -> CGFloat {
        max(
            320,
            height - StartTheme.Metrics.floatingButtonSize - StartTheme.Metrics.homeListBottomPadding - 16
        )
    }

    private func contentList(minHeight: CGFloat) -> some View {
        Group {
            if appState.connections.isEmpty {
                ConnectionEmptyState(minHeight: minHeight)
                    .transition(.opacity)
            } else if appState.activeConnection?.enabled == false {
                ConnectionDisabledState(
                    minHeight: minHeight,
                    onOpenConnections: {
                        connectionsOpen = true
                    }
                )
                .transition(.opacity)
            } else if appState.relay.status.isAttempting {
                ConnectionProgressState(status: appState.relay.status, minHeight: minHeight)
                    .transition(.opacity)
            } else if appState.relay.status == .offline && appState.activeConnection != nil {
                ConnectionRetryState(minHeight: minHeight, onRetry: appState.retryConnection)
                    .transition(.opacity)
            } else if appState.sessionLoadState == .loaded {
                let sections = workspaceChatSections(from: visibleChats, sort: sort)

                if sections.isEmpty {
                    ChatListEmptyState(
                        searching: !appState.searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                        minHeight: minHeight
                    )
                        .transition(.opacity)
                } else {
                    WorkspaceChatList(
                        sections: sections,
                        expandedWorkspaces: $expandedWorkspaces,
                        transitionNamespace: transitionNamespace
                    )
                    .transition(.opacity)
                }
            } else if appState.sessionLoadState == .loading {
                SkeletonList()
                    .transition(.opacity)
            } else {
                ChatListEmptyState(searching: false, minHeight: minHeight)
                    .transition(.opacity)
            }
        }
        .padding(.top, 4)
    }

    private func connectedBottomControls(searchActive: Bool, searchText: Binding<String>) -> some View {
        VStack {
            Spacer()

            HStack(spacing: searchActive ? 6 : 10) {
                HomeSearchBar(text: searchText, focused: $searchFocused)

                if !searchActive {
                    ChatButton(transitionNamespace: transitionNamespace) {
                        StartHaptics.lightImpact()
                        withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
                            appState.openNewChat()
                        }
                    }
                    .transition(.scale(scale: 0.76).combined(with: .opacity))
                }
            }
            .animation(.snappy(duration: 0.14, extraBounce: 0), value: searchActive)
            .padding(.leading, searchActive ? 8 : StartTheme.Metrics.floatingButtonHorizontalPadding)
            .padding(.trailing, searchActive ? 8 : StartTheme.Metrics.floatingButtonHorizontalPadding)
            .padding(.bottom, searchActive ? 16 : StartTheme.Metrics.floatingButtonBottomPadding)
        }
        .ignoresSafeArea(.container, edges: .bottom)
    }

    private var addConnectionBottomButton: some View {
        bottomActionButton(
            title: "Add connection",
            systemImage: "plus",
            action: {
                scannerOpen = true
            }
        )
    }

    private var connectionsBottomButton: some View {
        bottomActionButton(
            title: "Connections",
            systemImage: "globe",
            action: {
                connectionsOpen = true
            }
        )
    }

    private func bottomActionButton(
        title: String,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        VStack {
            Spacer()

            Button {
                StartHaptics.lightImpact()
                action()
            } label: {
                Label(title, systemImage: systemImage)
                    .font(.system(size: 16, weight: .semibold))
                    .labelStyle(.titleAndIcon)
                    .foregroundStyle(StartTheme.Colors.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: StartTheme.Metrics.floatingButtonHitSize)
            }
            .buttonStyle(.plain)
            .contentShape(Capsule())
            .glassCapsule()
            .accessibilityLabel(title)
            .padding(.horizontal, StartTheme.Metrics.floatingButtonHorizontalPadding)
            .padding(.bottom, StartTheme.Metrics.floatingButtonBottomPadding)
        }
        .ignoresSafeArea(.container, edges: .bottom)
    }

    private func openPendingScanner() {
        guard scannerPendingAfterConnections else { return }

        scannerPendingAfterConnections = false
        scannerOpen = true
    }

    private var titleRow: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 1) {
                Text("Start")
                    .font(StartTheme.Text.title)
                    .foregroundStyle(StartTheme.Colors.ink)

                if !appState.connections.isEmpty {
                    ConnectionStatusLabel(label: appState.connectionStatusLabel)
                }
            }
            .frame(height: StartTheme.Metrics.floatingButtonSize, alignment: .center)
            .contentShape(Rectangle())
            .onTapGesture {
                if appState.relay.status == .offline && appState.activeConnection?.enabled == true {
                    appState.retryConnection()
                }
            }

            Spacer()

            HomeTopMenu(
                sort: sort,
                onSelectSort: { sort = $0 },
                onOpenConnections: {
                    connectionsOpen = true
                }
            )
        }
        .frame(height: StartTheme.Metrics.floatingButtonSize)
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
