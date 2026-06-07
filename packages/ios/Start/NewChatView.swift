import SwiftUI

struct NewChatView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var focused: Bool

    var body: some View {
        @Bindable var appState = appState

        ZStack {
            EdgeFadeOverlay(topHeight: 104, bottomHeight: 160)
                .ignoresSafeArea()

            Text("What should we work on?")
                .font(.system(size: 22, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.horizontal, 24)

            VStack(spacing: 0) {
                header
                    .zIndex(1)

                Spacer(minLength: 0)

                ChatPromptFooter(
                    text: $appState.draft,
                    focused: $focused,
                    onSend: appState.sendNewDraft,
                    accessibilityHint: "Type what you want to work on",
                    accessibilityLabel: "Prompt",
                    placeholder: "Ask anything"
                )
                .focused($focused)
                .padding(.bottom, 6)
            }
            .padding(.leading, 16)
            .padding(.trailing, 10)
        }
        .contentShape(Rectangle())
        .simultaneousGesture(dismissGesture)
        .accessibilityAction(.escape) {
            close()
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            appState.promptFocused = false
        }
        .onChange(of: appState.promptFocused) { _, value in
            focused = value
        }
        .onChange(of: focused) { _, value in
            appState.promptFocused = value
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            ChatHeaderIconButton(systemName: "chevron.left", accessibilityLabel: "Back") {
                close()
            }
            .accessibilityHint("Returns to chats")

            VStack(alignment: .leading, spacing: 2) {
                Text("New chat")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)

                ChatHeaderMetadata(
                    branchName: appState.activeBranchName,
                    workspaceName: appState.activeProjectName
                )
            }

            Spacer()

            ChatOptionsMenu(
                canRename: false,
                canArchive: false,
                onRename: {},
                onArchive: {}
            )
        }
        .padding(.top, 8)
        .padding(.bottom, 8)
    }

    private var dismissGesture: some Gesture {
        DragGesture(minimumDistance: 28)
            .onEnded { value in
                let horizontalSwipe = value.translation.width < -96
                let mostlyHorizontal = abs(value.translation.height) < 44

                guard horizontalSwipe && mostlyHorizontal else { return }
                close()
            }
    }

    private func close() {
        focused = false

        withAnimation(.smooth(duration: 0.18)) {
            appState.closeTop()
        }
    }
}


#Preview {
    NewChatView()
        .environment(AppState())
        .preferredColorScheme(.dark)
}
