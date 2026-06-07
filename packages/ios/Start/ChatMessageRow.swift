import SwiftUI

struct ChatMessageRow: View {
    let message: ChatMessage
    let onCopy: (ChatMessage) -> Bool

    private var alignment: Alignment {
        message.role == .user ? .trailing : .leading
    }

    private var hasText: Bool {
        !message.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 6) {
            if message.role == .user {
                userBubble
            } else {
                agentMessage
            }
        }
        .frame(maxWidth: .infinity, alignment: alignment)
    }

    private var userBubble: some View {
        Text(message.text)
            .font(.system(size: 16, weight: .regular))
            .foregroundStyle(StartTheme.Colors.ink)
            .lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemFill), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .accessibilityLabel("User: \(message.text)")
            .contextMenu {
                Button {
                    _ = onCopy(message)
                } label: {
                    Label("Copy", systemImage: "doc.on.doc")
                }
            }
            .frame(maxWidth: 310, alignment: .trailing)
    }

    private var agentMessage: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let thinking = message.thinking?.trimmingCharacters(in: .whitespacesAndNewlines), !thinking.isEmpty {
                ThinkingDisclosure(message: message, thinking: thinking)
            }

            if hasText {
                Text(message.text)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if !message.streaming && hasText {
                AgentMessageFooter(onCopy: { onCopy(message) })
            }
        }
        .frame(maxWidth: 330, alignment: .leading)
        .accessibilityElement(children: .contain)
    }
}

private struct ThinkingDisclosure: View {
    @State private var expanded = false

    let message: ChatMessage
    let thinking: String

    var body: some View {
        VStack(alignment: .leading, spacing: expanded ? 6 : 0) {
            Button {
                StartHaptics.selection()
                withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
                    expanded.toggle()
                }
            } label: {
                HStack(spacing: 6) {
                    if message.streaming {
                        ProgressView()
                            .controlSize(.mini)
                            .tint(StartTheme.Colors.softInk)
                    }

                    Text(thinkingTitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(StartTheme.Colors.softInk)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(thinkingTitle)

            if expanded {
                Text(thinking)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk)
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .clipped()
    }

    private var thinkingTitle: String {
        guard let duration = durationLabel(for: message.durationMs) else {
            return message.streaming ? "Working" : "Worked"
        }
        return message.streaming ? "Working \(duration)" : "Worked \(duration)"
    }
}

private struct AgentMessageFooter: View {
    @State private var copied = false
    @State private var resetTask: Task<Void, Never>?

    let onCopy: () -> Bool

    var body: some View {
        HStack {
            Button(action: copy) {
                Image(systemName: copied ? "checkmark" : "doc.on.doc")
                    .contentTransition(.symbolEffect(.replace))
                    .font(.system(size: copied ? 14 : 13, weight: .medium))
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .foregroundStyle(copied ? StartTheme.Colors.success : StartTheme.Colors.softInk)
            .accessibilityLabel(copied ? "Copied response" : "Copy response")

            Spacer(minLength: 0)
        }
        .padding(.top, 1)
        .onDisappear {
            resetTask?.cancel()
            resetTask = nil
        }
    }

    private func copy() {
        guard onCopy() else { return }

        resetTask?.cancel()
        copied = true
        resetTask = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(1200))
            guard !Task.isCancelled else { return }
            copied = false
        }
    }
}

private func durationLabel(for durationMs: Int?) -> String? {
    guard let durationMs else { return nil }

    let seconds = max(0, Int((Double(durationMs) / 1000).rounded()))
    if seconds < 1 { return "<1s" }
    if seconds < 60 { return "\(seconds)s" }

    let minutes = seconds / 60
    let remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? "\(minutes)m \(remainingSeconds)s" : "\(minutes)m"
}
