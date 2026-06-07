import SwiftUI

struct ConnectionsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var scannerOpen = false
    @State private var selectedConnection: Connection?
    let connections: [Connection]
    let activeConnectionID: UUID?
    let onDeleteConnection: (Connection) -> Void
    let onRenameConnection: (Connection, String) -> Void
    let connectionState: (Connection) -> ConnectionState
    let onSelectConnection: (Connection) -> Void

    var body: some View {
        NavigationStack {
            List {
                ForEach(connections) { connection in
                    Button {
                        StartHaptics.selection()
                        if connection.enabled && activeConnectionID != connection.id {
                            onSelectConnection(connection)
                        }
                        selectedConnection = connection
                    } label: {
                        ConnectionListRow(
                            connection: connection,
                            state: connectionState(connection)
                        )
                    }
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }

            }
            .background(StartTheme.Colors.background)
            .listStyle(.plain)
            .navigationTitle("Connections")
            .scrollContentBackground(.hidden)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        StartHaptics.lightImpact()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .accessibilityLabel("Close")
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        StartHaptics.lightImpact()
                        scannerOpen = true
                    } label: {
                        Label("Add", systemImage: "plus")
                    }
                    .accessibilityLabel("Add connection")
                }
            }
        }
        .background(StartTheme.Colors.background.ignoresSafeArea())
        .sheet(isPresented: $scannerOpen) {
            ConnectionScannerSheet()
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
                }
            )
        }
    }
}

private struct ConnectionListRow: View {
    let connection: Connection
    let state: ConnectionState

    var body: some View {
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
        .padding(.vertical, 8)
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
        onDeleteConnection: { _ in },
        onRenameConnection: { _, _ in },
        connectionState: { _ in .online },
        onSelectConnection: { _ in }
    )
}
