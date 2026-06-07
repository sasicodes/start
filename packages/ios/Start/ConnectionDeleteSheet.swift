import SwiftUI

struct ConnectionDeleteSheet: View {
    @Environment(\.dismiss) private var dismiss
    let connection: Connection
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "trash")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color(.systemRed))
                    .frame(width: 38, height: 38)
                    .background(Color(.systemRed).opacity(0.12), in: Circle())

                VStack(alignment: .leading, spacing: 5) {
                    Text("Delete connection?")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink)

                    Text(connection.name)
                        .font(.system(size: 15, weight: .regular))
                        .foregroundStyle(StartTheme.Colors.softInk)
                        .lineLimit(2)
                }
            }

            Text("This removes it from this iPhone.")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(StartTheme.Colors.softInk)

            HStack(spacing: 10) {
                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                }
                .buttonStyle(.plain)
                .glassCapsule()

                Button(role: .destructive) {
                    onDelete()
                    dismiss()
                } label: {
                    Label("Delete", systemImage: "trash")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(Color(.systemRed), in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 22)
        .padding(.vertical, 20)
        .presentationDetents([.height(226)])
        .connectionSheetChrome(cornerRadius: 34)
    }
}

#Preview {
    ConnectionDeleteSheet(
        connection: Connection(
            name: "MacBook.local",
            enabled: true,
            relayUrl: "wss://relay.example.com",
            desktopId: "preview"
        ),
        onDelete: {}
    )
}
