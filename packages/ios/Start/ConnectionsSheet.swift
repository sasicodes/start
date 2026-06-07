import SwiftUI

struct ConnectionsSheet: View {
    @State private var connectionToDelete: Connection?
    @State private var connectionToRename: Connection?
    @State private var renameDraft = ""
    @State private var renameOpen = false
    let connections: [Connection]
    let activeConnectionID: UUID?
    let onAddConnection: () -> Void
    let onDeleteConnection: (Connection) -> Void
    let onRenameConnection: (Connection, String) -> Void
    let connectionState: (Connection) -> ConnectionState
    let onSelectConnection: (Connection) -> Void
    let onSetConnectionEnabled: (Connection, Bool) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            sheetHeader

            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 10) {
                    newConnectionButton

                    ForEach(connections) { connection in
                        ConnectionSheetRow(
                            active: activeConnectionID == connection.id,
                            connection: connection,
                            state: connectionState(connection),
                            onDelete: {
                                StartHaptics.lightImpact()
                                connectionToDelete = connection
                            },
                            onRename: {
                                StartHaptics.selection()
                                connectionToRename = connection
                                renameDraft = connection.name
                                renameOpen = true
                            },
                            onSelect: {
                                StartHaptics.selection()
                                withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
                                    onSelectConnection(connection)
                                }
                            },
                            onToggleEnabled: { enabled in
                                StartHaptics.selection()
                                onSetConnectionEnabled(connection, enabled)
                            }
                        )
                    }
                }
                .padding(.bottom, 18)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 20)
        .sheet(item: $connectionToDelete) { connection in
            ConnectionDeleteSheet(connection: connection) {
                onDeleteConnection(connection)
                connectionToDelete = nil
                StartHaptics.success()
            }
        }
        .alert("Rename connection", isPresented: $renameOpen) {
            TextField("Name", text: $renameDraft)

            Button("Cancel", role: .cancel) {
                connectionToRename = nil
                renameDraft = ""
            }

            Button("Save") {
                guard let connection = connectionToRename else { return }
                onRenameConnection(connection, renameDraft)
                connectionToRename = nil
                renameDraft = ""
                StartHaptics.success()
            }
        }
        .presentationDetents([.fraction(0.68), .large])
        .connectionSheetChrome()
    }

    private var sheetHeader: some View {
        HStack(spacing: 10) {
            Image(systemName: "globe")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(width: 38, height: 38)
                .glassCircle()

            VStack(alignment: .leading, spacing: 2) {
                Text("Connections")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)

                Text("Choose one desktop at a time.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk)
            }
        }
        .padding(.horizontal, 4)
    }

    private var newConnectionButton: some View {
        Button {
            StartHaptics.lightImpact()
            onAddConnection()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .frame(width: 36, height: 36)
                    .glassCircle()

                VStack(alignment: .leading, spacing: 3) {
                    Text("New connection")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink)

                    Text("Scan a desktop pairing code.")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(StartTheme.Colors.softInk)
                }

                Spacer()
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .glassRoundedRectangle(cornerRadius: 22)
        }
        .buttonStyle(.plain)
    }
}

private struct ConnectionSheetRow: View {
    let active: Bool
    let connection: Connection
    let state: ConnectionState
    let onDelete: () -> Void
    let onRename: () -> Void
    let onSelect: () -> Void
    let onToggleEnabled: (Bool) -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button(action: onSelect) {
                HStack(spacing: 12) {
                    connectionIcon

                    VStack(alignment: .leading, spacing: 3) {
                        Text(connection.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(connection.enabled ? StartTheme.Colors.ink : StartTheme.Colors.softInk)
                            .lineLimit(1)

                        Text(statusLabel)
                            .font(.system(size: 13, weight: .regular))
                            .foregroundStyle(statusColor)
                    }

                    Spacer(minLength: 0)
                }
            }
            .buttonStyle(.plain)

            Toggle("", isOn: Binding(
                get: { connection.enabled },
                set: { enabled in
                    onToggleEnabled(enabled)
                }
            ))
            .labelsHidden()
            .tint(StartTheme.Colors.ink)

            IconRowButton(
                systemName: "pencil",
                tint: StartTheme.Colors.ink,
                action: onRename
            )
            .accessibilityLabel("Rename connection")

            IconRowButton(
                systemName: "trash",
                tint: Color(.systemRed),
                action: onDelete
            )
            .accessibilityLabel("Delete connection")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .glassRoundedRectangle(cornerRadius: 22)
    }

    private var connectionIcon: some View {
        ZStack(alignment: .bottomTrailing) {
            Image(systemName: "laptopcomputer")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(iconColor)
                .frame(width: 36, height: 36)
                .glassCircle()

            if active {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(iconColor)
                    .background(StartTheme.Colors.background, in: Circle())
                    .offset(x: 1, y: 1)
            }
        }
    }

    private var iconColor: Color {
        guard connection.enabled else { return StartTheme.Colors.softInk.opacity(0.62) }
        return state.symbolColor
    }

    private var statusColor: Color {
        guard connection.enabled else { return StartTheme.Colors.softInk.opacity(0.72) }
        return active ? state.symbolColor : StartTheme.Colors.softInk
    }

    private var statusLabel: String {
        guard connection.enabled else { return "Disabled" }
        guard active else { return "Available" }
        switch state {
        case .online:
            return "Connected"
        case .offline:
            return "Not connected"
        }
    }
}

private struct IconRowButton: View {
    let systemName: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
        .contentShape(Circle())
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
