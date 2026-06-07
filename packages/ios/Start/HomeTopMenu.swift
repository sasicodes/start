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
        HStack(spacing: 8) {
            sortMenu

            connectionMenu
        }
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
                .labelStyle(.iconOnly)
                .font(.system(size: StartTheme.Metrics.floatingButtonIconSize, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(width: StartTheme.Metrics.floatingButtonSize, height: StartTheme.Metrics.floatingButtonSize)
                .accessibilityHidden(true)
        }
        .accessibilityLabel("Sort")
        .buttonStyle(.plain)
        .glassCircle()
    }

    private var connectionMenu: some View {
        Menu {
            if !connections.isEmpty {
                Menu {
                    ForEach(connections) { connection in
                        connectionButton(connection)
                    }
                } label: {
                    Label("Connections", systemImage: "laptopcomputer")
                }
            }

            Button {
                StartHaptics.lightImpact()
                onAddConnection()
            } label: {
                Label("New connection", systemImage: "plus")
            }
        } label: {
            Label("Connections", systemImage: "laptopcomputer")
                .labelStyle(.iconOnly)
                .font(.system(size: StartTheme.Metrics.floatingButtonIconSize, weight: .semibold))
                .foregroundStyle(activeConnectionColor)
                .frame(width: StartTheme.Metrics.floatingButtonSize, height: StartTheme.Metrics.floatingButtonSize)
                .accessibilityHidden(true)
        }
        .accessibilityLabel("Connections")
        .buttonStyle(.plain)
        .glassCircle()
    }

    private var activeConnectionColor: Color {
        guard let connection = connections.first(where: { $0.id == activeConnectionID }) else {
            return StartTheme.Colors.ink
        }
        return connectionState(connection).symbolColor
    }

    private func connectionButton(_ connection: Connection) -> some View {
        Button {
            StartHaptics.selection()
            withAnimation(.snappy(duration: 0.1, extraBounce: 0)) {
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
