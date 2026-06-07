import SwiftUI
import Foundation

struct ChatMessageRow: View {
    let message: ChatMessage
    let onCopy: (ChatMessage) -> Bool

    private var alignment: Alignment {
        message.role == .user ? .trailing : .leading
    }

    private var hasText: Bool {
        !message.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var hasThinking: Bool {
        !thinkingText.isEmpty
    }

    private var showsActivity: Bool {
        message.streaming || hasThinking
    }

    private var thinkingText: String {
        message.thinking?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }

    private var userBubbleBackground: Color {
        Color(white: 0.92)
    }

    private var userBubbleText: Color {
        Color.black.opacity(0.92)
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
            .foregroundStyle(userBubbleText)
            .lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(userBubbleBackground, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .accessibilityLabel("User: \(message.text)")
            .contextMenu {
                Button {
                    _ = onCopy(message)
                } label: {
                    Label("Copy", systemImage: "square.on.square")
                }
            }
            .frame(maxWidth: 310, alignment: .trailing)
    }

    private var agentMessage: some View {
        VStack(alignment: .leading, spacing: 8) {
            if showsActivity {
                ThinkingDisclosure(message: message, thinking: thinkingText)
            }

            if hasText {
                MarkdownText(
                    message.text,
                    color: StartTheme.Colors.ink,
                    font: .system(size: 16, weight: .regular),
                    lineSpacing: 3
                )
            }
        }
        .frame(maxWidth: 330, alignment: .leading)
        .contentShape(Rectangle())
        .contextMenu {
            if hasText {
                Button {
                    _ = onCopy(message)
                } label: {
                    Label("Copy", systemImage: "square.on.square")
                }
            }
        }
        .accessibilityElement(children: .contain)
    }
}

private struct ThinkingDisclosure: View {
    @State private var overrideExpanded: Bool?

    let message: ChatMessage
    let thinking: String

    var body: some View {
        VStack(alignment: .leading, spacing: expanded ? 6 : 0) {
            if hasThinking {
                Button {
                    toggle()
                } label: {
                    label
                }
                .buttonStyle(.plain)
                .accessibilityLabel(thinkingTitle)
                .accessibilityValue(expanded ? "Expanded" : "Collapsed")
            } else {
                label
                    .accessibilityLabel(thinkingTitle)
            }

            if expanded && hasThinking {
                MarkdownText(
                    thinkingMarkdown(thinking),
                    color: StartTheme.Colors.softInk,
                    font: .system(size: 13, weight: .regular),
                    lineSpacing: 2
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .clipped()
    }

    private var expanded: Bool {
        overrideExpanded ?? message.streaming
    }

    private var hasThinking: Bool {
        !thinking.isEmpty
    }

    private var label: some View {
        HStack(spacing: 6) {
            Text(thinkingTitle)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(StartTheme.Colors.softInk)
                .contentTransition(.numericText())
        }
    }

    private var thinkingTitle: String {
        let duration = durationLabel(for: message.durationMs) ?? "<1s"
        return "\(message.streaming ? "Working" : "Worked") \(duration)"
    }

    private func toggle() {
        StartHaptics.selection()
        withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
            overrideExpanded = !expanded
        }
    }
}

private struct MarkdownText: View {
    @State private var rendered: AttributedString
    @State private var renderedSource: String

    let color: Color
    let font: Font
    let source: String
    let lineSpacing: CGFloat

    init(
        _ source: String,
        color: Color,
        font: Font,
        lineSpacing: CGFloat
    ) {
        self.font = font
        self.color = color
        self.source = source
        self.lineSpacing = lineSpacing

        let rendered = renderMarkdown(source)
        _rendered = State(initialValue: rendered)
        _renderedSource = State(initialValue: source)
    }

    var body: some View {
        Text(rendered)
            .font(font)
            .foregroundStyle(color)
            .lineSpacing(lineSpacing)
            .fixedSize(horizontal: false, vertical: true)
            .task(id: source) {
                guard renderedSource != source else { return }
                rendered = renderMarkdown(source)
                renderedSource = source
            }
    }
}

private func boldTitle(in line: String) -> String? {
    guard line.hasPrefix("**"), line.hasSuffix("**") else { return nil }

    let title = line
        .dropFirst(2)
        .dropLast(2)
        .trimmingCharacters(in: .whitespaces)

    guard !title.isEmpty, !title.contains("*") else { return nil }
    return title
}

private func renderMarkdown(_ source: String) -> AttributedString {
    let options = AttributedString.MarkdownParsingOptions(
        interpretedSyntax: .full,
        failurePolicy: .returnPartiallyParsedIfPossible
    )

    return (try? AttributedString(markdown: source, options: options)) ?? AttributedString(source)
}

private func thinkingMarkdown(_ thinking: String) -> String {
    var compacted = thinking
        .split(separator: "\n", omittingEmptySubsequences: false)
        .map { line -> String in
            let text = String(line)
            let trimmed = text.trimmingCharacters(in: .whitespaces)
            guard let title = boldTitle(in: trimmed) else { return text }
            return "### \(title)"
        }
        .joined(separator: "\n")
        .trimmingCharacters(in: .whitespacesAndNewlines)

    while compacted.contains("\n\n\n") {
        compacted = compacted.replacingOccurrences(of: "\n\n\n", with: "\n\n")
    }

    return compacted
}

private func durationLabel(for durationMs: Int?) -> String? {
    guard let durationMs else { return nil }

    let seconds = max(0, Int((Double(durationMs) / 1000).rounded()))
    if seconds < 1 { return "<1s" }
    if seconds < 60 { return "\(seconds)s" }

    let minutes = seconds / 60
    let remainingSeconds = seconds % 60
    if minutes < 60 {
        return remainingSeconds > 0 ? "\(minutes)m \(remainingSeconds)s" : "\(minutes)m"
    }

    let hours = minutes / 60
    let remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? "\(hours)h \(remainingMinutes)m" : "\(hours)h"
}
