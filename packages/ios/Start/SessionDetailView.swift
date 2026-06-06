import SwiftUI

struct SessionDetailView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var focused: Bool
    @State private var focusTask: Task<Void, Never>?

    let session: ChatSession

    private var messages: [ChatMessage] {
        ChatMessage.samples(for: session)
    }

    var body: some View {
        @Bindable var appState = appState

        VStack(spacing: 0) {
            header
                .zIndex(1)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(messages) { message in
                        MessageRow(message: message)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 26)
                .padding(.bottom, 24)
            }
            .overlay {
                EdgeFadeOverlay()
            }

            DetailPromptBar(text: $appState.draft, focused: $focused)
                .focused($focused)
                .padding(.bottom, 14)
        }
        .padding(.leading, 16)
        .padding(.trailing, 10)
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
                guard case .session = appState.route else { return }
                appState.composerFocused = false
            }
        }
        .onChange(of: appState.composerFocused) { _, value in
            focused = value
        }
        .onChange(of: focused) { _, value in
            appState.composerFocused = value
        }
        .onDisappear {
            focusTask?.cancel()
            focusTask = nil
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            GlassIconButton(systemName: "chevron.left", accessibilityLabel: "Back") {
                close()
            }
            .accessibilityHint("Returns to chats")
            .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 3) {
                Text(session.title)
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .lineLimit(1)

                Text(session.projectName)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk)
            }

            Spacer()
        }
        .padding(.top, 8)
    }

    private var dismissGesture: some Gesture {
        DragGesture(minimumDistance: 24)
            .onEnded { value in
                let horizontalSwipe = value.translation.width < -70
                let verticalSwipe = value.translation.height > 70

                guard horizontalSwipe || verticalSwipe else { return }
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

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(message.role.rawValue)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(message.role == .agent ? StartTheme.Colors.success : StartTheme.Colors.softInk)

            Text(message.text)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

private struct DetailPromptBar: View {
    @Binding var text: String
    @FocusState.Binding var focused: Bool

    var body: some View {
        VStack(spacing: 14) {
            TextField("Reply", text: $text, axis: .vertical)
                .focused($focused)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .tint(StartTheme.Colors.ink)
                .lineLimit(1...4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
                .padding(.trailing, 10)
                .padding(.top, 12)
                .accessibilityLabel("Reply")

            HStack(spacing: 10) {
                Button {} label: {
                    Image(systemName: "plus")
                        .font(.system(size: 19, weight: .regular))
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Add attachment")

                Spacer()

                Text("5.5 Medium")
                    .font(.system(size: 15, weight: .regular))
                    .lineLimit(1)
                    .frame(height: 32)
                    .accessibilityLabel("Model 5.5 Medium")

                Button {} label: {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(text.isEmpty ? StartTheme.Colors.softInk : StartTheme.Colors.background)
                        .frame(width: 36, height: 36)
                        .glassProminentCircle(enabled: !text.isEmpty)
                }
                .accessibilityLabel("Send message")
                .accessibilityHint(text.isEmpty ? "Enter a reply before sending" : "")
            }
            .buttonStyle(.plain)
            .foregroundStyle(StartTheme.Colors.ink)
            .frame(maxWidth: .infinity)
            .frame(height: 36)
            .padding(.leading, 14)
            .padding(.trailing, 10)
            .padding(.bottom, 8)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 96)
        .glassRoundedRectangle(cornerRadius: 24)
    }
}

#Preview {
    SessionDetailView(session: ChatSession.samples[0])
        .environment(AppState())
        .preferredColorScheme(.dark)
}
