import SwiftUI

struct HomeTopMenu: View {
    let sort: WorkspaceSort
    let connections: [Connection]
    let activeConnectionID: UUID?
    let onAddConnection: () -> Void
    let onSelectSort: (WorkspaceSort) -> Void
    let connectionState: (Connection) -> ConnectionState
    let onSelectConnection: (Connection) -> Void

    var body: some View {
        Menu {
            if !connections.isEmpty {
                sortMenu
            }
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
            Label("Sort", systemImage: sort.icon)
        }
    }

    private var connectionMenu: some View {
        Menu {
            Button(action: onAddConnection) {
                Label("New connection", systemImage: "plus")
            }

            if !connections.isEmpty {
                Divider()
            }

            ForEach(connections) { connection in
                Button {
                    withAnimation(.smooth(duration: 0.18)) {
                        onSelectConnection(connection)
                    }
                } label: {
                    let active = activeConnectionID == connection.id
                    let state = connectionState(connection)

                    Label {
                        Text(connection.name)
                            .foregroundStyle(active ? state.symbolColor : StartTheme.Colors.ink)
                            .padding(.leading, active ? 4 : 0)
                    } icon: {
                        ZStack(alignment: .bottomTrailing) {
                            Image(systemName: "laptopcomputer")
                                .foregroundStyle(state.symbolColor)

                            if active {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(state.symbolColor)
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
    let connection = Connection(
        name: "Preview",
        enabled: true,
        relayUrl: "wss://relay.example.com",
        desktopId: "preview"
    )

    HomeTopMenu(
        sort: .recent,
        connections: [connection],
        activeConnectionID: connection.id,
        onAddConnection: {},
        onSelectSort: { _ in },
        connectionState: { _ in .online },
        onSelectConnection: { _ in }
    )
}
