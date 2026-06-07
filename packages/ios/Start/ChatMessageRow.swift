import SwiftUI

struct ChatMessageRow: View {
    let message: ChatMessage
    let onCopy: (ChatMessage) -> Void

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
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(message.role.rawValue): \(message.text)")
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
            .contextMenu {
                Button {
                    onCopy(message)
                } label: {
                    Label("Copy", systemImage: "square.on.square")
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
                AgentMessageFooter(message: message, onCopy: { onCopy(message) })
            }
        }
        .frame(maxWidth: 330, alignment: .leading)
    }
}

private struct ThinkingDisclosure: View {
    @State private var expanded = false

    let message: ChatMessage
    let thinking: String

    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            Text(thinking)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(StartTheme.Colors.softInk)
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)
        } label: {
            Text(thinkingTitle)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(StartTheme.Colors.softInk)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var thinkingTitle: String {
        guard let duration = durationLabel(for: message.durationMs) else {
            return message.streaming ? "Thinking" : "Thought"
        }
        return message.streaming ? "Thinking for \(duration)" : "Thought for \(duration)"
    }
}

private struct AgentMessageFooter: View {
    let message: ChatMessage
    let onCopy: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Text(messageFooterLabel)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(StartTheme.Colors.softInk.opacity(0.72))

            Button(action: onCopy) {
                Image(systemName: "square.on.square")
                    .font(.system(size: 13, weight: .medium))
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .foregroundStyle(StartTheme.Colors.softInk)
            .accessibilityLabel("Copy response")

            Spacer(minLength: 0)
        }
        .padding(.top, 1)
    }

    private var messageFooterLabel: String {
        if let duration = durationLabel(for: message.durationMs) {
            return "\(messageTimeLabel(for: message.createdAt)) · \(duration)"
        }
        return messageTimeLabel(for: message.createdAt)
    }
}

private func durationLabel(for durationMs: Int?) -> String? {
    guard let durationMs, durationMs > 0 else { return nil }

    let seconds = max(1, Int((Double(durationMs) / 1000).rounded()))
    if seconds < 60 { return "\(seconds)s" }

    let minutes = seconds / 60
    let remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? "\(minutes)m \(remainingSeconds)s" : "\(minutes)m"
}

private func messageTimeLabel(for timestamp: Int) -> String {
    Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000).formatted(date: .omitted, time: .shortened)
}
