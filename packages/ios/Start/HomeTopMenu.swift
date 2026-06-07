import SwiftUI

struct HomeTopMenu: View {
    let sort: WorkspaceSort
    let onSelectSort: (WorkspaceSort) -> Void
    let onOpenConnections: () -> Void

    var body: some View {
        Menu {
            sortMenu

            connectionsMenu
        } label: {
            Label("More", systemImage: "ellipsis")
                .labelStyle(.iconOnly)
                .font(.system(size: StartTheme.Metrics.floatingButtonIconSize, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(width: StartTheme.Metrics.floatingButtonSize, height: StartTheme.Metrics.floatingButtonSize)
                .accessibilityHidden(true)
        }
        .accessibilityLabel("More")
        .buttonStyle(.plain)
        .glassCircle()
    }

    private var sortMenu: some View {
        Menu {
            ForEach(WorkspaceSort.allCases) { option in
                Button {
                    StartHaptics.selection()
                    onSelectSort(option)
                } label: {
                    Label(option.label, systemImage: option == sort ? "checkmark" : option.icon)
                }
            }
        } label: {
            Label("Sort", systemImage: sort.icon)
        }
    }

    private var connectionsMenu: some View {
        Button {
            StartHaptics.lightImpact()
            onOpenConnections()
        } label: {
            Label("Connections", systemImage: "globe")
        }
    }
}

#Preview {
    HomeTopMenu(
        sort: .recent,
        onSelectSort: { _ in },
        onOpenConnections: {}
    )
}
