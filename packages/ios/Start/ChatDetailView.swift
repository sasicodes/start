import SwiftUI

struct ChatDetailView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var focused: Bool
    @State private var focusTask: Task<Void, Never>?

    let chat: Chat
    private let messages: [ChatMessage]

    init(chat: Chat) {
        self.chat = chat
        messages = ChatMessage.samples(for: chat)
    }

    var body: some View {
        @Bindable var appState = appState

        ZStack(alignment: .top) {
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 12) {
                    ForEach(messages) { message in
                        MessageRow(message: message)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 82)
                .padding(.bottom, 132)
                .padding(.leading, 16)
                .padding(.trailing, 10)
            }

            EdgeFadeOverlay(topHeight: 96, topSolidHeight: 82, bottomHeight: 160)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.leading, 16)
                    .padding(.trailing, 10)

                Spacer(minLength: 0)

                ChatPromptFooter(
                    text: $appState.draft,
                    focused: $focused,
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
        .contentShape(Rectangle())
        .simultaneousGesture(dismissGesture)
        .accessibilityAction(.escape) {
            close()
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
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

            ChatHeaderIconButton(systemName: "ellipsis", accessibilityLabel: "More") {}
        }
        .padding(.top, 8)
        .padding(.bottom, 8)
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
}

private struct MessageRow: View {
    let message: ChatMessage

    private var alignment: Alignment {
        message.role == .user ? .trailing : .leading
    }

    var body: some View {
        Group {
            if message.role == .user {
                Text(message.text)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            } else {
                Text(message.text)
            }
        }
        .font(.system(size: 16, weight: .regular))
        .foregroundStyle(StartTheme.Colors.ink)
        .lineSpacing(3)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: 300, alignment: alignment)
        .frame(maxWidth: .infinity, alignment: alignment)
        .accessibilityLabel("\(message.role.rawValue): \(message.text)")
    }
}


#Preview {
    ChatDetailView(chat: Chat.samples[0])
        .environment(AppState())
        .preferredColorScheme(.dark)
}
