import SwiftUI
import UIKit

struct ChatDetailView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var focused: Bool
    @State private var focusTask: Task<Void, Never>?
    @State private var renameDraft = ""
    @State private var renameOpen = false
    @State private var initialScrollDone = false
    @State private var olderPagingEnabled = false

    let chat: Chat

    var body: some View {
        @Bindable var appState = appState
        let messages = appState.messages(for: chat)
        let lastMessageId = messages.last?.id ?? ""

        ZStack(alignment: .top) {
            ScrollViewReader { proxy in
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 0) {
                        Color.clear
                            .frame(height: 1)
                            .onAppear {
                                guard olderPagingEnabled else { return }
                                appState.loadOlderMessages(for: chat)
                            }

                        ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                            ChatMessageRow(message: message, onCopy: copy)
                                .padding(.top, messageGap(messages: messages, index: index))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 82)
                    .padding(.bottom, 132)
                    .padding(.leading, 16)
                    .padding(.trailing, 10)
                }
                .onAppear {
                    scrollToInitialBottom(proxy: proxy, messages: messages)
                }
                .onChange(of: lastMessageId) { _, _ in
                    scrollToInitialBottom(proxy: proxy, messages: messages)
                }
                .task(id: chat.id) {
                    if !initialScrollDone {
                        olderPagingEnabled = false
                    }
                    appState.refreshMessages(for: chat)
                }
            }

            EdgeFadeOverlay(topHeight: 16, topOpacity: 0.24, bottomHeight: 160)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                headerSurface

                Spacer(minLength: 0)

                ChatPromptFooter(
                    text: $appState.draft,
                    focused: $focused,
                    onSend: { appState.sendDraft(in: chat) },
                    accessibilityHint: "Type a follow-up for this chat",
                    accessibilityLabel: "Reply",
                    placeholder: "Ask for follow-ups"
                )
                .focused($focused)
                .padding(.leading, 16)
                .padding(.trailing, 10)
                .padding(.bottom, 6)
            }
        }
        .background(StartTheme.Colors.background)
        .contentShape(Rectangle())
        .simultaneousGesture(dismissGesture)
        .accessibilityAction(.escape) {
            close()
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .alert("Rename", isPresented: $renameOpen) {
            TextField("Name", text: $renameDraft)
            Button("Cancel", role: .cancel) {
                renameDraft = ""
            }
            Button("Save") {
                StartHaptics.lightImpact()
                appState.rename(chat, title: renameDraft)
            }
        }
        .onAppear {
            focusTask = Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(140))
                guard case .chat = appState.route else { return }
                appState.promptFocused = false
            }
        }
        .onChange(of: appState.promptFocused) { _, value in
            focused = value
        }
        .onChange(of: focused) { _, value in
            appState.promptFocused = value
        }
        .onDisappear {
            focusTask?.cancel()
            focusTask = nil
        }
    }

    private var headerSurface: some View {
        header
            .padding(.leading, 16)
            .padding(.trailing, 10)
            .background {
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .overlay(StartTheme.Colors.background.opacity(0.34))
                    .ignoresSafeArea(edges: .top)
            }
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(Color(.separator).opacity(0.16))
                    .frame(height: 0.5)
            }
    }

    private var header: some View {
        HStack(spacing: 10) {
            ChatHeaderIconButton(systemName: "chevron.left", accessibilityLabel: "Back", action: close)
                .accessibilityHint("Returns to chats")

            VStack(alignment: .leading, spacing: 2) {
                Text(chat.title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .lineLimit(1)

                ChatHeaderMetadata(
                    branchName: chat.branchName,
                    workspaceName: chat.projectName
                )
            }

            Spacer()

            ChatOptionsMenu(
                canRename: appState.remoteCommandsAvailable,
                canArchive: appState.remoteCommandsAvailable,
                onRename: openRename,
                onArchive: {
                    appState.archive(chat)
                }
            )
        }
        .padding(.top, 8)
        .padding(.bottom, 8)
    }

    private func openRename() {
        renameDraft = chat.title
        renameOpen = true
    }

    private var dismissGesture: some Gesture {
        DragGesture(minimumDistance: 28)
            .onEnded { value in
                let startsAtLeadingEdge = value.startLocation.x < 32
                let horizontalSwipe = value.translation.width > 96
                let mostlyHorizontal = abs(value.translation.height) < 44

                guard startsAtLeadingEdge && horizontalSwipe && mostlyHorizontal else { return }
                close()
            }
    }

    private func close() {
        focusTask?.cancel()
        focused = false

        withAnimation(.smooth(duration: 0.18)) {
            appState.closeTop()
        }
    }

    private func copy(_ message: ChatMessage) -> Bool {
        let text = message.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return false }

        UIPasteboard.general.string = text
        StartHaptics.success()
        return true
    }

    private func scrollToInitialBottom(proxy: ScrollViewProxy, messages: [ChatMessage]) {
        guard !initialScrollDone, let last = messages.last else { return }

        proxy.scrollTo(last.id, anchor: .bottom)
        initialScrollDone = true
        olderPagingEnabled = true
    }

    private func messageGap(messages: [ChatMessage], index: Int) -> CGFloat {
        guard index > 0 else { return 0 }

        let previous = messages[index - 1]
        let current = messages[index]
        if previous.role == .user && current.role == .agent { return 16 }
        if previous.role == .agent && current.role == .user { return 22 }
        return 12
    }
}

private func previewChat() -> Chat {
    Chat(
        id: "preview-session",
        title: "Preview session",
        modified: Int(Date().timeIntervalSince1970 * 1000),
        workspaceName: "start",
        workspacePath: "/workspace/start"
    )
}

@MainActor
private func previewAppState(chat: Chat) -> AppState {
    let appState = AppState(chats: [chat])
    appState.sessionMessages[chat.id] = [
        ChatMessage(
            id: "preview-user",
            role: .user,
            text: "Summarize the current sync behavior.",
            createdAt: Int(Date().addingTimeInterval(-28).timeIntervalSince1970 * 1000)
        ),
        ChatMessage(
            id: "preview-agent",
            role: .agent,
            text: "Mobile fetches the session index first, then requests the latest page only after a session opens.",
            createdAt: Int(Date().addingTimeInterval(-24).timeIntervalSince1970 * 1000),
            durationMs: 6200,
            thinking: "Mapped the relay events and checked pagination boundaries."
        )
    ]
    appState.messagePageStates[chat.id] = MessagePageState(loading: false, hasMoreOlder: true, nextOffset: 2)
    return appState
}

#Preview {
    let chat = previewChat()

    ChatDetailView(chat: chat)
        .environment(previewAppState(chat: chat))
        .preferredColorScheme(.dark)
}
