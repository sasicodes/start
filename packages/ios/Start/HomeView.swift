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
        .overlay {
            VStack {
                Spacer()

                HStack {
                    Spacer()

                    NewChatButton(transitionNamespace: transitionNamespace) {
                        withAnimation(.smooth(duration: 0.18)) {
                            appState.openComposer()
                        }
                    }
                    .padding(.trailing, StartTheme.Metrics.floatingButtonHorizontalPadding)
                    .padding(.bottom, StartTheme.Metrics.floatingButtonBottomPadding)
                }
            }
            .ignoresSafeArea(.container, edges: .bottom)
        }
        .refreshable {
            await appState.refreshSessions()
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
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("New connection")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)

                Text("Scan the QR code on your desktop to pair this iPhone.")
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk)
            }
            .padding(.horizontal, 4)

            QRCodeScannerView { _ in
                dismiss()
            }
            .overlay {
                ScannerReticle()
            }
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(18)
        .presentationDetents([.fraction(0.78)])
        .presentationCornerRadius(34)
        .presentationDragIndicator(.visible)
        .presentationBackground(StartTheme.Colors.background)
    }
}

private struct ScannerReticle: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(.white.opacity(0.82), lineWidth: 2)
                .frame(width: 220, height: 220)
                .shadow(color: .black.opacity(0.24), radius: 18)

            VStack {
                Spacer()

                Text("Center the code")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 18)
            }
        }
        .padding(18)
        .allowsHitTesting(false)
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
