import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var searchFocused: Bool
    @State private var scannerOpen = false
    @State private var expandedWorkspaces = Set<String>()
    @State private var connectionToDelete: Connection?
    @State private var connectionToRename: Connection?
    @State private var connectionRenameDraft = ""
    @State private var deleteConfirmationOpen = false
    @State private var renameConnectionOpen = false
    @State private var workspaceExpansionInitialized = false
    @State private var sort = WorkspaceSort.recent
    let transitionNamespace: Namespace.ID

    var body: some View {
        @Bindable var appState = appState
        let searchActive = searchFocused || !appState.searchText.isEmpty
        let connected = !appState.connections.isEmpty

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
            if connected {
                connectedBottomControls(searchActive: searchActive, searchText: $appState.searchText)
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
        .alert("Rename connection", isPresented: $renameConnectionOpen) {
            TextField("Name", text: $connectionRenameDraft)

            Button("Cancel", role: .cancel) {
                connectionToRename = nil
                connectionRenameDraft = ""
            }

            Button("Save") {
                guard let connection = connectionToRename else { return }
                appState.renameConnection(connection, name: connectionRenameDraft)
                connectionToRename = nil
                connectionRenameDraft = ""
                StartHaptics.success()
            }
        }
        .confirmationDialog(
            "Delete connection?",
            isPresented: $deleteConfirmationOpen,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                guard let connection = connectionToDelete else { return }
                appState.deleteConnection(connection)
                connectionToDelete = nil
                StartHaptics.success()
            }

            Button("Cancel", role: .cancel) {
                connectionToDelete = nil
            }
        } message: {
            Text("This removes it from this iPhone.")
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
        VStack {
            Spacer()

            Button {
                StartHaptics.lightImpact()
                scannerOpen = true
            } label: {
                Label("Add connection", systemImage: "plus")
                    .font(.system(size: 16, weight: .semibold))
                    .labelStyle(.titleAndIcon)
                    .foregroundStyle(StartTheme.Colors.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: StartTheme.Metrics.floatingButtonHitSize)
            }
            .buttonStyle(.plain)
            .contentShape(Capsule())
            .glassCapsule()
            .accessibilityLabel("Add connection")
            .padding(.horizontal, StartTheme.Metrics.floatingButtonHorizontalPadding)
            .padding(.bottom, StartTheme.Metrics.floatingButtonBottomPadding)
        }
        .ignoresSafeArea(.container, edges: .bottom)
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
                if appState.relay.status == .offline && appState.activeConnection != nil {
                    appState.retryConnection()
                }
            }

            Spacer()

            HomeTopMenu(
                sort: sort,
                connections: appState.connections,
                activeConnectionID: appState.activeConnectionID,
                onAddConnection: {
                    scannerOpen = true
                },
                onSelectSort: { sort = $0 },
                onDeleteConnection: { connection in
                    connectionToDelete = connection
                    deleteConfirmationOpen = true
                },
                onRenameConnection: { connection in
                    connectionToRename = connection
                    connectionRenameDraft = connection.name
                    renameConnectionOpen = true
                },
                connectionState: { appState.connectionState(for: $0) },
                onSelectConnection: appState.selectConnection
            )
        }
        .frame(height: StartTheme.Metrics.floatingButtonSize)
    }
}

private struct ConnectionStatusLabel: View {
    let label: String

    var body: some View {
        Text(label)
            .contentTransition(.opacity)
            .font(.system(size: 11, weight: .regular))
            .foregroundStyle(StartTheme.Colors.softInk.opacity(0.58))
            .animation(.easeInOut(duration: 0.16), value: label)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(label)
    }
}

private struct ConnectionEmptyState: View {
    let minHeight: CGFloat

    var body: some View {
        VStack(spacing: 7) {
            Text("No connections")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)

            VStack(spacing: 4) {
                Text("Open the desktop app, then go to")

                HStack(spacing: 5) {
                    Text("Settings")

                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))

                    Text("Mobile")
                }
            }
            .font(.system(size: 14, weight: .regular))
            .multilineTextAlignment(.center)
            .foregroundStyle(StartTheme.Colors.softInk)
            .frame(maxWidth: 260)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

private struct ConnectionProgressState: View {
    let status: RelayConnectionStatus
    let minHeight: CGFloat

    var body: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
                .tint(StartTheme.Colors.softInk)

            Text(status.rawValue)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

private struct ConnectionRetryState: View {
    let minHeight: CGFloat
    let onRetry: () -> Void

    var body: some View {
        VStack {
            Button(action: onRetry) {
                Label("Retry", systemImage: "arrow.clockwise")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Retry connection")
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

private struct ChatListEmptyState: View {
    let searching: Bool
    let minHeight: CGFloat

    private var message: String {
        searching ? "No chats match your search." : "No chats yet."
    }

    var body: some View {
        VStack(spacing: 7) {
            Text(message)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)

            if !searching {
                Text("New conversations will appear here.")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

private struct HomeSearchBar: View {
    @Binding var text: String
    @FocusState.Binding var focused: Bool

    private var active: Bool {
        focused || !text.isEmpty
    }

    var body: some View {
        HStack(spacing: active ? 6 : 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink.opacity(0.82))

                TextField(
                    "",
                    text: $text,
                    prompt: Text("Search")
                        .foregroundStyle(StartTheme.Colors.ink.opacity(0.62))
                )
                .focused($focused)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .tint(StartTheme.Colors.ink)
                .submitLabel(.search)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .accessibilityLabel("Search chats")
                .onSubmit {
                    focused = false
                }
            }
            .frame(maxWidth: .infinity, minHeight: StartTheme.Metrics.floatingButtonHitSize)
            .padding(.leading, 16)
            .padding(.trailing, 14)
            .contentShape(Capsule())
            .glassSearchCapsule(active: active)
            .simultaneousGesture(
                TapGesture().onEnded {
                    focused = true
                }
            )

            if active {
                Button {
                    StartHaptics.lightImpact()
                    withAnimation(.snappy(duration: 0.14, extraBounce: 0)) {
                        text = ""
                        focused = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink.opacity(0.84))
                        .frame(width: StartTheme.Metrics.floatingButtonHitSize, height: StartTheme.Metrics.floatingButtonHitSize)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .glassSearchCapsule(active: true)
                .accessibilityLabel("Close search")
                .transition(.searchBubbleSplit)
                .zIndex(1)
            }
        }
        .animation(.snappy(duration: 0.14, extraBounce: 0), value: active)
    }
}

private struct SearchBubbleSplitModifier: ViewModifier {
    let active: Bool

    func body(content: Content) -> some View {
        content
            .scaleEffect(active ? 1 : 0.82, anchor: .leading)
            .offset(x: active ? 0 : -18)
            .opacity(active ? 1 : 0)
    }
}

private extension AnyTransition {
    static var searchBubbleSplit: AnyTransition {
        .asymmetric(
            insertion: .modifier(
                active: SearchBubbleSplitModifier(active: false),
                identity: SearchBubbleSplitModifier(active: true)
            ),
            removal: .modifier(
                active: SearchBubbleSplitModifier(active: false),
                identity: SearchBubbleSplitModifier(active: true)
            )
        )
    }
}

private struct ConnectionScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState

    var body: some View {
        QRCodeScannerView { payload in
            if appState.pair(with: payload) {
                dismiss()
            }
        }
        .overlay(alignment: .center) {
            ScannerReticle()
        }
        .overlay(alignment: .bottom) {
            ScannerInstruction()
                .padding(.bottom, 18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 52, style: .continuous))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 14)
        .padding(.vertical, 18)
        .ignoresSafeArea(.container, edges: .bottom)
        .presentationDetents([.fraction(0.78)])
        .presentationCornerRadius(58)
        .presentationDragIndicator(.visible)
        .presentationBackground(StartTheme.Colors.background)
    }
}

private struct ScannerReticle: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 26, style: .continuous)
            .stroke(.white.opacity(0.82), lineWidth: 2)
            .frame(width: 220, height: 220)
            .shadow(color: .black.opacity(0.24), radius: 18)
            .padding(18)
            .allowsHitTesting(false)
    }
}

private struct ScannerInstruction: View {
    var body: some View {
        Text("Scan the QR code on your desktop")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .allowsHitTesting(false)
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
