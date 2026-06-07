import SwiftUI
import UIKit

private enum WorkspaceChatListMetrics {
    static let titleFont = Font.system(size: 17, weight: .regular)
    static let headingFont = Font.system(size: 15, weight: .semibold)
    static let rowMinHeight: CGFloat = 44
    static let rowSpacing: CGFloat = 8
    static let sectionSpacing: CGFloat = 14
}

struct WorkspaceChatList: View {
    @Environment(AppState.self) private var appState

    let sections: [WorkspaceChatSection]
    @Binding var expandedWorkspaces: Set<String>
    let transitionNamespace: Namespace.ID

    var body: some View {
        LazyVStack(alignment: .leading, spacing: WorkspaceChatListMetrics.sectionSpacing) {
            ForEach(sections) { section in
                WorkspaceChatAccordion(
                    section: section,
                    expanded: expandedWorkspaces.contains(section.workspacePath),
                    transitionNamespace: transitionNamespace,
                    onToggle: { toggle(section.workspacePath) }
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, StartTheme.Metrics.chatListTopPadding)
    }

    private func toggle(_ workspacePath: String) {
        UISelectionFeedbackGenerator().selectionChanged()
        withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
            if expandedWorkspaces.contains(workspacePath) {
                expandedWorkspaces.remove(workspacePath)
            } else {
                expandedWorkspaces.insert(workspacePath)
            }
        }
    }
}

private struct WorkspaceChatAccordion: View {
    @Environment(AppState.self) private var appState

    let section: WorkspaceChatSection
    let expanded: Bool
    let transitionNamespace: Namespace.ID
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: onToggle) {
                HStack(spacing: 7) {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .rotationEffect(.degrees(expanded ? 0 : -90))
                        .animation(.snappy(duration: 0.08, extraBounce: 0), value: expanded)

                    Text(section.workspaceName)
                        .font(WorkspaceChatListMetrics.headingFont)
                        .lineLimit(1)

                    Spacer()
                }
                .foregroundStyle(StartTheme.Colors.softInk)
                .frame(maxWidth: .infinity, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(section.workspaceName) workspace")
            .accessibilityValue(expanded ? "Expanded" : "Collapsed")

            if expanded {
                LazyVStack(spacing: WorkspaceChatListMetrics.rowSpacing) {
                    ForEach(section.chats) { chat in
                        ChatRow(chat: chat, transitionNamespace: transitionNamespace)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .clipped()
        .animation(.snappy(duration: 0.12, extraBounce: 0), value: expanded)
    }
}

private struct ChatRow: View {
    @Environment(AppState.self) private var appState

    let chat: Chat
    let transitionNamespace: Namespace.ID

    var body: some View {
        let status = visibleStatus

        return Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.snappy(duration: 0.12, extraBounce: 0)) {
                appState.openChat(chat)
            }
        } label: {
            HStack(alignment: .center, spacing: 8) {
                Text(chat.title)
                    .font(WorkspaceChatListMetrics.titleFont)
                    .foregroundStyle(StartTheme.Colors.ink)
                    .lineLimit(1)

                Spacer(minLength: 8)

                if let status {
                    SessionStatusIndicator(status: status)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: WorkspaceChatListMetrics.rowMinHeight, alignment: .leading)
            .contentShape(Rectangle())
        }
        .matchedTransitionSource(id: chat.id, in: transitionNamespace)
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(chat.title)
        .accessibilityValue(status?.accessibilityLabel ?? "")
        .accessibilityHint("Opens chat")
    }

    private var visibleStatus: ChatSessionStatus? {
        if case let .chat(sessionId) = appState.route, sessionId == chat.id {
            return nil
        }
        if chat.status == .generating {
            return .generating
        }
        if chat.status == .completed || chat.noticeKind == .completed {
            return .completed
        }
        return nil
    }
}

private struct SessionStatusIndicator: View {
    let status: ChatSessionStatus

    var body: some View {
        Group {
            if status == .generating {
                ProgressView()
                    .controlSize(.mini)
                    .tint(StartTheme.Colors.softInk.opacity(0.72))
            } else {
                Circle()
                    .fill(StartTheme.Colors.success.opacity(0.78))
                    .frame(width: 7, height: 7)
            }
        }
        .frame(width: 14, height: 14)
        .accessibilityHidden(true)
    }
}

private extension ChatSessionStatus {
    var accessibilityLabel: String {
        switch self {
        case .generating:
            "Working"
        case .completed:
            "Completed"
        case .idle, .failed:
            ""
        }
    }
}

struct SkeletonList: View {
    private static let titleWidthRatios: [CGFloat] = [
        0.52, 0.72, 0.92, 0.64, 0.84, 1.0, 0.72, 0.9, 0.58, 0.78, 0.96, 0.68, 0.86, 0.62, 0.76
    ]

    var body: some View {
        LazyVStack(spacing: WorkspaceChatListMetrics.rowSpacing) {
            ForEach(Array(Self.titleWidthRatios.enumerated()), id: \.offset) { _, ratio in
                HStack {
                    SkeletonTextLine(width: 240 * ratio)

                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(minHeight: WorkspaceChatListMetrics.rowMinHeight, alignment: .leading)
            }
        }
        .padding(.top, StartTheme.Metrics.chatListTopPadding)
        .accessibilityHidden(true)
    }
}

private struct SkeletonTextLine: View {
    let width: CGFloat

    var body: some View {
        Text("Chat title")
            .font(WorkspaceChatListMetrics.titleFont)
            .lineLimit(1)
            .hidden()
            .frame(width: width, alignment: .leading)
            .overlay(alignment: .leading) {
                Capsule()
                    .fill(StartTheme.Colors.softInk.opacity(0.22))
                    .frame(width: width, height: 23)
            }
    }
}
