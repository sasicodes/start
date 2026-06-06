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

private enum SessionListMetrics {
    static let dateFont = Font.system(size: 13, weight: .medium)
    static let titleFont = Font.system(size: 17, weight: .regular)
    static let rowMinHeight: CGFloat = 44
    static let rowSpacing: CGFloat = 10
    static let rowTextSpacing: CGFloat = 12
}

private struct SessionList: View {
    @Environment(AppState.self) private var appState

    let sessions: [ChatSession]
    let transitionNamespace: Namespace.ID

    var body: some View {
        VStack(spacing: SessionListMetrics.rowSpacing) {
            ForEach(sessions) { session in
                Button {
                    withTransaction(Transaction(animation: .easeOut(duration: 0.1))) {
                        appState.openSession(session)
                    }
                } label: {
                    SessionRowLayout {
                        Text(session.title)
                            .font(SessionListMetrics.titleFont)
                            .foregroundStyle(.white.opacity(0.88))
                            .lineLimit(1)

                        Spacer(minLength: SessionListMetrics.rowTextSpacing)

                        Text(session.updatedAt)
                            .font(SessionListMetrics.dateFont)
                            .foregroundStyle(.white.opacity(0.48))
                    }
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

private struct SessionRowLayout<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: SessionListMetrics.rowTextSpacing) {
            content()
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: SessionListMetrics.rowMinHeight)
        .contentShape(Rectangle())
    }
}

private struct SkeletonList: View {
    private static let titleWidthRatios: [CGFloat] = [
        0.52, 0.72, 0.92, 0.64, 0.84, 1.0, 0.72, 0.9, 0.58, 0.78, 0.96, 0.68, 0.86, 0.62, 0.76
    ]

    var body: some View {
        VStack(spacing: SessionListMetrics.rowSpacing) {
            ForEach(Array(Self.titleWidthRatios.enumerated()), id: \.offset) { _, ratio in
                SessionRowLayout {
                    SkeletonTextLine(width: 240 * ratio)

                    Spacer(minLength: SessionListMetrics.rowTextSpacing)
                }
            }
        }
        .padding(.top, StartTheme.Metrics.sessionListTopPadding)
        .accessibilityHidden(true)
    }
}

private struct SkeletonTextLine: View {
    let width: CGFloat

    var body: some View {
        Text("Session title")
            .font(SessionListMetrics.titleFont)
            .lineLimit(1)
            .hidden()
            .frame(width: width, alignment: .leading)
            .overlay(alignment: .leading) {
                Capsule()
                    .fill(.white.opacity(0.12))
                    .frame(width: width, height: 23)
            }
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
