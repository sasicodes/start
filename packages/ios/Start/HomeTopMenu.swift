import SwiftUI

struct HomeTopMenu: View {
    let sort: WorkspaceSort
    let connections: [Connection]
    let activeConnectionID: UUID?
    let onAddConnection: () -> Void
    let onSelectSort: (WorkspaceSort) -> Void
    let onDeleteConnection: (Connection) -> Void
    let onRenameConnection: (Connection) -> Void
    let connectionState: (Connection) -> ConnectionState
    let onSelectConnection: (Connection) -> Void

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
        Menu {
            Button {
                StartHaptics.lightImpact()
                onAddConnection()
            } label: {
                Label("New connection", systemImage: "plus")
            }

            ForEach(connections) { connection in
                connectionButton(connection)
            }

            if let activeConnection {
                Divider()

                Button {
                    StartHaptics.selection()
                    onRenameConnection(activeConnection)
                } label: {
                    Label("Rename", systemImage: "pencil")
                }

                Button(role: .destructive) {
                    StartHaptics.lightImpact()
                    onDeleteConnection(activeConnection)
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
        } label: {
            Label("Connections", systemImage: "globe")
        }
    }

    private var activeConnection: Connection? {
        connections.first { $0.id == activeConnectionID }
    }

    private func connectionButton(_ connection: Connection) -> some View {
        Button {
            StartHaptics.selection()
            withAnimation(.snappy(duration: 0.1, extraBounce: 0)) {
                onSelectConnection(connection)
            }
        } label: {
            connectionLabel(connection)
        }
    }

    private func connectionLabel(_ connection: Connection) -> some View {
        let active = activeConnectionID == connection.id
        let state = connectionState(connection)

        return Label {
            Text(connection.name)
                .foregroundStyle(active ? state.symbolColor : StartTheme.Colors.ink)
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
        onDeleteConnection: { _ in },
        onRenameConnection: { _ in },
        connectionState: { _ in .online },
        onSelectConnection: { _ in }
    )
}
