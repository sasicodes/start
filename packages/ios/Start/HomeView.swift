import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState
    @State private var scannerOpen = false
    @State private var expandedWorkspaces = Set(Workspace.allCases)
    @State private var sort = WorkspaceSort.recent
    let transitionNamespace: Namespace.ID

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                titleRow

                contentList
            }
            .padding(.horizontal, StartTheme.Metrics.pagePadding)
            .padding(.bottom, StartTheme.Metrics.homeListBottomPadding)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .overlay(alignment: .bottomTrailing) {
            NewChatButton(transitionNamespace: transitionNamespace) {
                withAnimation(.smooth(duration: 0.18)) {
                    appState.openComposer()
                }
            }
            .padding(.trailing, StartTheme.Metrics.floatingButtonHorizontalPadding)
            .padding(.bottom, StartTheme.Metrics.floatingButtonBottomPadding)
            .ignoresSafeArea(.container, edges: .bottom)
        }
        .animation(.easeOut(duration: 0.16), value: appState.sessionsLoaded)
        .sheet(isPresented: $scannerOpen) {
            ConnectionScannerSheet()
        }
        .task {
            guard !appState.sessionsLoaded else { return }
            appState.sessionsLoaded = true
        }
    }

    private var contentList: some View {
        Group {
            if appState.sessionsLoaded {
                WorkspaceSessionList(
                    sections: workspaceSessionSections(from: appState.sessions, sort: sort),
                    expandedWorkspaces: $expandedWorkspaces,
                    transitionNamespace: transitionNamespace
                )
                .transition(.opacity)
            } else {
                SkeletonList()
                    .transition(.opacity)
            }
        }
        .padding(.top, 4)
    }

    private var titleRow: some View {
        HStack(alignment: .center) {
            Text("Start")
                .font(StartTheme.Text.title)
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(height: StartTheme.Metrics.floatingButtonSize, alignment: .center)

            Spacer()

            HomeTopMenu(
                sort: sort,
                activeConnectionID: appState.activeConnectionID,
                connections: appState.connections,
                onAddConnection: {
                    scannerOpen = true
                },
                onSelectSort: { sort = $0 },
                onSelectConnection: appState.selectConnection
            )
        }
        .frame(height: StartTheme.Metrics.floatingButtonSize)
    }
}

private struct ConnectionScannerSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            QRCodeScannerView { _ in
                dismiss()
            }
            .ignoresSafeArea(edges: .bottom)
            .navigationTitle("Scan QR Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(StartTheme.Colors.background)
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
