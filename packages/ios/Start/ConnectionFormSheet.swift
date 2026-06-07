import SwiftUI

struct ConnectionFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    let connection: Connection
    let state: ConnectionState
    let onDelete: () -> Void
    let onRename: (String) -> Void

    init(
        connection: Connection,
        state: ConnectionState,
        onDelete: @escaping () -> Void,
        onRename: @escaping (String) -> Void
    ) {
        self.connection = connection
        self.state = state
        self.onDelete = onDelete
        self.onRename = onRename
        _name = State(initialValue: connection.name)
    }

    var body: some View {
        VStack(spacing: 18) {
            header

            VStack(spacing: 0) {
                formRow(title: "Display name") {
                    TextField("Name", text: $name)
                        .multilineTextAlignment(.trailing)
                        .foregroundStyle(StartTheme.Colors.ink)
                        .submitLabel(.done)
                }

                Divider()

                formRow(title: "Host name") {
                    Text(relayHost)
                        .lineLimit(1)
                        .foregroundStyle(StartTheme.Colors.softInk)
                }

                Divider()

                formRow(title: "Type") {
                    Text("Codex Desktop")
                        .foregroundStyle(StartTheme.Colors.softInk)
                }

                Divider()

                formRow(title: "Status") {
                    HStack(spacing: 7) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 7, height: 7)

                        Text(statusLabel)
                    }
                    .foregroundStyle(StartTheme.Colors.softInk)
                }
            }
            .glassRoundedRectangle(cornerRadius: 24)

            Button {
                StartHaptics.lightImpact()
                onDelete()
                dismiss()
            } label: {
                Text("Delete connection")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color(.systemRed))
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
            }
            .buttonStyle(.plain)
            .glassCapsule()
        }
        .padding(.horizontal, 22)
        .padding(.top, 18)
        .padding(.bottom, 24)
        .presentationDetents([.height(372), .medium])
        .connectionSheetChrome(cornerRadius: 42)
    }

    private var header: some View {
        HStack {
            Button {
                StartHaptics.lightImpact()
                dismiss()
            } label: {
                Text("Cancel")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .frame(width: 82, height: 44)
            }
            .buttonStyle(.plain)
            .glassCapsule()

            Spacer()

            Text(connection.name)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
                .lineLimit(1)

            Spacer()

            Button {
                save()
            } label: {
                Text("Save")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(nameValid ? StartTheme.Colors.ink : StartTheme.Colors.softInk)
                    .frame(width: 82, height: 44)
            }
            .buttonStyle(.plain)
            .disabled(!nameValid)
            .glassCapsule()
        }
    }

    private var nameValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var relayHost: String {
        URL(string: connection.relayUrl)?.host ?? connection.relayUrl
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

    private func formRow<Content: View>(
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)

            Spacer()

            content()
                .font(.system(size: 16, weight: .regular))
        }
        .padding(.horizontal, 18)
        .frame(height: 52)
    }

    private func save() {
        guard nameValid else { return }

        onRename(name)
        StartHaptics.success()
        dismiss()
    }
}

#Preview {
    ConnectionFormSheet(
        connection: Connection(
            name: "Office",
            enabled: true,
            relayUrl: "wss://relay.example.com/connect",
            desktopId: "desktop"
        ),
        state: .online,
        onDelete: {},
        onRename: { _ in }
    )
}
