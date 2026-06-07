import SwiftUI

struct ConnectionStatusLabel: View {
    let label: String

    var body: some View {
        Text(label)
            .contentTransition(.opacity)
            .font(.system(size: 11, weight: .regular))
            .foregroundStyle(StartTheme.Colors.softInk.opacity(0.58))
            .animation(.easeInOut(duration: 0.16), value: label)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(label)
    }
}

struct ConnectionEmptyState: View {
    let minHeight: CGFloat

    var body: some View {
        VStack(spacing: 7) {
            Text("No connections")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)

            VStack(spacing: 4) {
                Text("Open the desktop app, then go to")

                HStack(spacing: 5) {
                    Text("Settings")

                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))

                    Text("Mobile")
                }
            }
            .font(.system(size: 14, weight: .regular))
            .multilineTextAlignment(.center)
            .foregroundStyle(StartTheme.Colors.softInk)
            .frame(maxWidth: 260)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

struct ConnectionProgressState: View {
    let label: String
    let minHeight: CGFloat

    var body: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
                .tint(StartTheme.Colors.softInk)

            Text(label)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

struct ConnectionRetryState: View {
    let minHeight: CGFloat
    let onRetry: () -> Void

    var body: some View {
        VStack {
            Button(action: onRetry) {
                Label("Retry", systemImage: "arrow.clockwise")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Retry connection")
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

struct ConnectionDisabledState: View {
    let minHeight: CGFloat
    let onOpenConnections: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            Text("Connection disabled")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)

            Text("Enable it from Connections.")
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(StartTheme.Colors.softInk)

            Button(action: onOpenConnections) {
                Label("Connections", systemImage: "globe")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .frame(height: 44)
                    .padding(.horizontal, 18)
            }
            .buttonStyle(.plain)
            .contentShape(Capsule())
            .glassCapsule()
            .accessibilityLabel("Connections")
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}

struct ChatListEmptyState: View {
    let searching: Bool
    let minHeight: CGFloat

    private var message: String {
        searching ? "No chats match your search." : "No chats yet."
    }

    var body: some View {
        VStack(spacing: 7) {
            Text(message)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)

            if !searching {
                Text("New conversations will appear here.")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: minHeight)
    }
}
