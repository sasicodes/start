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
        NavigationStack {
            Form {
                Section {
                    LabeledContent("Name") {
                        TextField("Name", text: $name)
                            .multilineTextAlignment(.trailing)
                            .onChange(of: name) {
                                saveName()
                            }
                            .submitLabel(.done)
                    }

                    LabeledContent("Host") {
                        Text(relayHost)
                            .foregroundStyle(StartTheme.Colors.softInk)
                            .lineLimit(1)
                    }

                    LabeledContent("Status") {
                        HStack(spacing: 7) {
                            Circle()
                                .fill(statusColor)
                                .frame(width: 7, height: 7)

                            Text(statusLabel)
                        }
                        .foregroundStyle(StartTheme.Colors.softInk)
                    }
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 14, bottom: 12, trailing: 14))
                .listRowBackground(Color.clear.background(.thinMaterial))

                Section {
                    Button(role: .destructive) {
                        StartHaptics.lightImpact()
                        onDelete()
                        dismiss()
                    } label: {
                        Text("Delete connection")
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 14, bottom: 12, trailing: 14))
                .listRowBackground(Color.clear.background(.thinMaterial))
            }
            .background(.clear)
            .contentMargins(.top, 28, for: .scrollContent)
            .contentMargins(.horizontal, 12, for: .scrollContent)
            .navigationTitle("")
            .scrollContentBackground(.hidden)
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationCornerRadius(42)
        .presentationDragIndicator(.visible)
        .presentationBackground(.ultraThinMaterial)
        .presentationDetents([.height(360)])
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

    private func saveName() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        onRename(name)
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
