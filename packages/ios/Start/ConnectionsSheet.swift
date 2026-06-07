import SwiftUI

struct ConnectionsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedConnection: Connection?
    let connections: [Connection]
    let activeConnectionID: UUID?
    let onAddConnection: () -> Void
    let onDeleteConnection: (Connection) -> Void
    let onRenameConnection: (Connection, String) -> Void
    let connectionState: (Connection) -> ConnectionState
    let onSelectConnection: (Connection) -> Void
    let onSetConnectionEnabled: (Connection, Bool) -> Void

    var body: some View {
        ZStack {
            StartTheme.Colors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Connections")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(StartTheme.Colors.softInk)

                        VStack(spacing: 0) {
                            ForEach(Array(connections.enumerated()), id: \.element.id) { index, connection in
                                ConnectionListRow(
                                    connection: connection,
                                    state: connectionState(connection)
                                ) {
                                    StartHaptics.selection()
                                    if activeConnectionID != connection.id {
                                        onSelectConnection(connection)
                                    }
                                    selectedConnection = connection
                                }

                                if index < connections.count - 1 {
                                    Divider()
                                        .padding(.leading, 64)
                                }
                            }

                            if !connections.isEmpty {
                                Divider()
                                    .padding(.leading, 64)
                            }

                            addConnectionButton
                        }
                        .glassPanel(cornerRadius: 30)
                    }
                    .padding(.horizontal, StartTheme.Metrics.pagePadding)
                    .padding(.top, 20)
                    .padding(.bottom, 32)
                }
            }
        }
        .sheet(item: $selectedConnection) { connection in
            let currentConnection = connections.first { $0.id == connection.id } ?? connection

            ConnectionFormSheet(
                connection: currentConnection,
                state: connectionState(currentConnection),
                onDelete: {
                    onDeleteConnection(currentConnection)
                    selectedConnection = nil
                },
                onRename: { name in
                    onRenameConnection(currentConnection, name)
                },
                onSetEnabled: { enabled in
                    onSetConnectionEnabled(currentConnection, enabled)
                }
            )
        }
    }

    private var header: some View {
        ZStack {
            Text("Connections")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)

            HStack {
                Spacer()

                Button {
                    StartHaptics.lightImpact()
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .accessibilityLabel("Close")
            }
        }
        .frame(height: 44)
        .padding(.horizontal, StartTheme.Metrics.pagePadding)
        .padding(.top, 18)
        .padding(.bottom, 8)
        .background(.ultraThinMaterial)
    }

    private var addConnectionButton: some View {
        Button {
            StartHaptics.lightImpact()
            onAddConnection()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: "plus")
                    .font(.system(size: 19, weight: .semibold))

                Text("Add connection")
                    .font(.system(size: 16, weight: .semibold))

                Spacer()
            }
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .foregroundStyle(Color(.systemBlue))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Add connection")
    }
}

private struct ConnectionListRow: View {
    let connection: Connection
    let state: ConnectionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: "laptopcomputer")
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(iconColor)
                    .frame(width: 30)

                VStack(alignment: .leading, spacing: 3) {
                    Text(connection.name)
                        .font(.system(size: 17, weight: .regular))
                        .foregroundStyle(connection.enabled ? StartTheme.Colors.ink : StartTheme.Colors.softInk)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 6, height: 6)

                        Text(statusLabel)
                            .font(.system(size: 14, weight: .regular))
                            .foregroundStyle(StartTheme.Colors.softInk)
                    }
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.softInk.opacity(0.72))
            }
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity)
            .frame(height: 76)
        }
        .buttonStyle(.plain)
    }

    private var iconColor: Color {
        guard connection.enabled else { return StartTheme.Colors.softInk.opacity(0.62) }
        return state.symbolColor
    }

    private var statusColor: Color {
        guard connection.enabled else { return StartTheme.Colors.softInk.opacity(0.72) }
        return state.symbolColor
    }

    private var statusLabel: String {
        guard connection.enabled else { return "Disabled" }
        switch state {
        case .online:
            return "Connected"
        case .offline:
            return "Not connected"
        }
    }
}

#Preview {
    ConnectionsSheet(
        connections: [
            Connection(
                name: "MacBook.local",
                enabled: true,
                relayUrl: "wss://relay.example.com",
                desktopId: "preview"
            )
        ],
        activeConnectionID: UUID(),
        onAddConnection: {},
        onDeleteConnection: { _ in },
        onRenameConnection: { _, _ in },
        connectionState: { _ in .online },
        onSelectConnection: { _ in },
        onSetConnectionEnabled: { _, _ in }
    )
}
