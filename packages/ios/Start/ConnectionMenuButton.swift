import SwiftUI

struct ConnectionMenuButton: View {
    let activeConnectionID: UUID
    let connections: [Connection]
    let onSelect: (Connection) -> Void
    let onAdd: () -> Void

    var body: some View {
        Menu {
            Button(action: onAdd) {
                Label("New connection", systemImage: "globe")
            }

            Divider()

            ForEach(connections) { connection in
                Toggle(isOn: Binding(
                    get: { activeConnectionID == connection.id },
                    set: { isOn in
                        if isOn {
                            withAnimation(.smooth(duration: 0.18)) {
                                onSelect(connection)
                            }
                        }
                    }
                )) {
                    Label {
                        Text(connection.name)
                    } icon: {
                        Image(systemName: "laptopcomputer")
                            .foregroundStyle(connection.state.symbolColor)
                    }
                }
            }
        } label: {
            Label("Connections", systemImage: "globe")
                .labelStyle(.iconOnly)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: StartTheme.Metrics.floatingButtonSize, height: StartTheme.Metrics.floatingButtonSize)
                .accessibilityHidden(true)
        }
        .accessibilityLabel("Connections")
        .buttonStyle(.plain)
        .glassCircle()
    }
}

#Preview {
    ConnectionMenuButton(
        activeConnectionID: Connection.samples[0].id,
        connections: Connection.samples,
        onSelect: { _ in },
        onAdd: {}
    )
    .preferredColorScheme(.dark)
}
