import SwiftUI

struct HomeTopMenu: View {
    let sort: WorkspaceSort
    let activeConnectionID: UUID
    let connections: [Connection]
    let onAddConnection: () -> Void
    let onSelectSort: (WorkspaceSort) -> Void
    let onSelectConnection: (Connection) -> Void

    var body: some View {
        Menu {
            sortMenu
            connectionMenu
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
                    onSelectSort(option)
                } label: {
                    Label(option.label, systemImage: option == sort ? "checkmark" : option.icon)
                }
            }
        } label: {
            Label("Sort workspaces", systemImage: sort.icon)
        }
    }

    private var connectionMenu: some View {
        Menu {
            Button(action: onAddConnection) {
                Label("New connection", systemImage: "plus")
            }

            Divider()

            ForEach(connections) { connection in
                Button {
                    withAnimation(.smooth(duration: 0.18)) {
                        onSelectConnection(connection)
                    }
                } label: {
                    Label {
                        Text(connection.name)
                    } icon: {
                        ZStack(alignment: .bottomTrailing) {
                            Image(systemName: "laptopcomputer")
                                .foregroundStyle(connection.state.symbolColor)

                            if activeConnectionID == connection.id {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(connection.state.symbolColor)
                                    .background(StartTheme.Colors.background, in: Circle())
                            }
                        }
                    }
                }
            }
        } label: {
            Label("Connections", systemImage: "globe")
        }
    }
}

#Preview {
    HomeTopMenu(
        sort: .recent,
        activeConnectionID: Connection.samples[0].id,
        connections: Connection.samples,
        onAddConnection: {},
        onSelectSort: { _ in },
        onSelectConnection: { _ in }
    )
}
