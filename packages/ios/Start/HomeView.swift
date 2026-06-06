import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState
    @State private var scannerOpen = false
    let transitionNamespace: Namespace.ID

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                titleRow

                contentList
            }
            .padding(.leading, StartTheme.Metrics.pagePadding)
            .padding(.trailing, StartTheme.Metrics.pagePadding)
            .padding(
                .bottom,
                StartTheme.Metrics.floatingButtonSize + StartTheme.Metrics.floatingButtonBottomPadding + 18
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .overlay(alignment: .bottomTrailing) {
            composeButton
                .padding(.trailing, StartTheme.Metrics.pagePadding)
        }
        .ignoresSafeArea(.container, edges: .bottom)
        .animation(.easeOut(duration: 0.16), value: appState.sessionsLoaded)
        .sheet(isPresented: $scannerOpen) {
            ConnectionScannerSheet()
        }
        .task {
            guard !appState.sessionsLoaded else { return }
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled else { return }
            appState.sessionsLoaded = true
        }
    }

    private var contentList: some View {
        Group {
            if appState.sessionsLoaded {
                SessionList(sessions: filteredSessions, transitionNamespace: transitionNamespace)
                    .transition(.opacity)
            } else {
                SkeletonList()
                    .transition(.opacity)
            }
        }
        .padding(.top, 4)
    }

    private var filteredSessions: [ChatSession] {
        appState.sessions.filter { $0.workspace == appState.activeWorkspace }
    }

    private var titleRow: some View {
        HStack(alignment: .center) {
            Text("Start")
                .font(StartTheme.Text.title)
                .foregroundStyle(.white)
                .frame(height: StartTheme.Metrics.floatingButtonSize, alignment: .center)

            Spacer()

            ConnectionMenuButton(
                activeConnectionID: appState.activeConnectionID,
                connections: appState.connections,
                onSelect: appState.selectConnection
            ) {
                scannerOpen = true
            }
        }
        .frame(height: StartTheme.Metrics.floatingButtonSize)
    }

    private var composeButton: some View {
        GlassIconButton(systemName: "plus", accessibilityLabel: "New chat") {
            withTransaction(Transaction(animation: .easeOut(duration: 0.1))) {
                appState.openComposer()
            }
        }
        .matchedTransitionSource(id: "composer", in: transitionNamespace)
        .padding(.bottom, StartTheme.Metrics.floatingButtonBottomPadding)
    }
}

private struct ConnectionScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var scannedPayload = ""

    var body: some View {
        NavigationStack {
            QRCodeScannerView { payload in
                scannedPayload = payload
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
        .presentationBackground(.black)
    }
}

private struct SessionList: View {
    @Environment(AppState.self) private var appState

    let sessions: [ChatSession]
    let transitionNamespace: Namespace.ID

    var body: some View {
        VStack(spacing: 10) {
            ForEach(sessions) { session in
                Button {
                    withTransaction(Transaction(animation: .easeOut(duration: 0.1))) {
                        appState.openSession(session)
                    }
                } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(session.title)
                            .font(.system(size: 17, weight: .regular))
                            .foregroundStyle(.white.opacity(0.88))
                            .lineLimit(1)

                        Spacer()

                        Text(session.updatedAt)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(0.48))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .matchedTransitionSource(id: session.id, in: transitionNamespace)
                .buttonStyle(.plain)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(session.title), \(session.updatedAt)")
                .accessibilityHint("Opens chat")
            }
        }
        .padding(.top, StartTheme.Metrics.sessionListTopPadding)
    }
}

private struct SkeletonList: View {
    private static let widthRatios: [CGFloat] = [
        0.52, 0.72, 0.92, 0.64, 0.84, 1.0, 0.72, 0.9, 0.58, 0.78, 0.96, 0.68, 0.86, 0.62, 0.76
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            ForEach(Array(Self.widthRatios.enumerated()), id: \.offset) { _, ratio in
                Capsule()
                    .fill(.white.opacity(0.12))
                    .frame(maxWidth: 320 * ratio, alignment: .leading)
                    .frame(height: 23)
            }
        }
        .padding(.top, StartTheme.Metrics.sessionListTopPadding)
        .accessibilityHidden(true)
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
