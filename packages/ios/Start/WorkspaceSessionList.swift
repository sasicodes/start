import SwiftUI

private enum WorkspaceSessionListMetrics {
    static let titleFont = Font.system(size: 17, weight: .regular)
    static let headingFont = Font.system(size: 15, weight: .semibold)
    static let rowMinHeight: CGFloat = 44
    static let rowSpacing: CGFloat = 8
    static let sectionSpacing: CGFloat = 14
}

struct WorkspaceSessionList: View {
    @Environment(AppState.self) private var appState

    let sections: [WorkspaceSessionSection]
    @Binding var expandedWorkspaces: Set<Workspace>
    let transitionNamespace: Namespace.ID

    var body: some View {
        VStack(alignment: .leading, spacing: WorkspaceSessionListMetrics.sectionSpacing) {
            ForEach(sections) { section in
                WorkspaceSessionAccordion(
                    section: section,
                    expanded: expandedWorkspaces.contains(section.workspace),
                    transitionNamespace: transitionNamespace,
                    onToggle: { toggle(section.workspace) }
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, StartTheme.Metrics.sessionListTopPadding)
    }

    private func toggle(_ workspace: Workspace) {
        withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
            if expandedWorkspaces.contains(workspace) {
                expandedWorkspaces.remove(workspace)
            } else {
                expandedWorkspaces.insert(workspace)
            }
        }
    }
}

private struct WorkspaceSessionAccordion: View {
    @Environment(AppState.self) private var appState

    let section: WorkspaceSessionSection
    let expanded: Bool
    let transitionNamespace: Namespace.ID
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: onToggle) {
                HStack(spacing: 7) {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .rotationEffect(.degrees(expanded ? 0 : -90))
                        .animation(.snappy(duration: 0.08, extraBounce: 0), value: expanded)

                    Text(section.workspace.rawValue)
                        .font(WorkspaceSessionListMetrics.headingFont)

                    Spacer()
                }
                .foregroundStyle(StartTheme.Colors.softInk)
                .frame(maxWidth: .infinity, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(section.workspace.rawValue) workspace")
            .accessibilityValue(expanded ? "Expanded" : "Collapsed")

            if expanded {
                VStack(spacing: WorkspaceSessionListMetrics.rowSpacing) {
                    ForEach(section.sessions) { session in
                        SessionRow(session: session, transitionNamespace: transitionNamespace)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .clipped()
        .animation(.snappy(duration: 0.12, extraBounce: 0), value: expanded)
    }
}

private struct SessionRow: View {
    @Environment(AppState.self) private var appState

    let session: Session
    let transitionNamespace: Namespace.ID

    var body: some View {
        Button {
            withAnimation(.smooth(duration: 0.18)) {
                appState.openSession(session)
            }
        } label: {
            HStack(alignment: .top) {
                Text(session.title)
                    .font(WorkspaceSessionListMetrics.titleFont)
                    .foregroundStyle(StartTheme.Colors.ink)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: WorkspaceSessionListMetrics.rowMinHeight, alignment: .leading)
            .contentShape(Rectangle())
        }
        .matchedTransitionSource(id: session.id, in: transitionNamespace)
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(session.title)
        .accessibilityHint("Opens session")
    }
}

struct SkeletonList: View {
    private static let titleWidthRatios: [CGFloat] = [
        0.52, 0.72, 0.92, 0.64, 0.84, 1.0, 0.72, 0.9, 0.58, 0.78, 0.96, 0.68, 0.86, 0.62, 0.76
    ]

    var body: some View {
        VStack(spacing: WorkspaceSessionListMetrics.rowSpacing) {
            ForEach(Array(Self.titleWidthRatios.enumerated()), id: \.offset) { _, ratio in
                HStack {
                    SkeletonTextLine(width: 240 * ratio)

                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(minHeight: WorkspaceSessionListMetrics.rowMinHeight, alignment: .leading)
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
            .font(WorkspaceSessionListMetrics.titleFont)
            .lineLimit(1)
            .hidden()
            .frame(width: width, alignment: .leading)
            .overlay(alignment: .leading) {
                Capsule()
                    .fill(StartTheme.Colors.softInk.opacity(0.22))
                    .frame(width: width, height: 23)
            }
    }
}
