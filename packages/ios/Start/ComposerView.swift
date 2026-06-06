import SwiftUI

struct ComposerView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var focused: Bool
    @State private var focusTask: Task<Void, Never>?

    var body: some View {
        @Bindable var appState = appState

        VStack(spacing: 0) {
            header

            Spacer()

            VStack(spacing: 8) {
                Text("What should we work on?")
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(.white)

                HStack(spacing: 8) {
                    Image(systemName: "folder")
                    Text("start")
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                }
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(.white.opacity(0.58))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Workspace start")
            }
            .padding(.bottom, 106)

            PromptBar(text: $appState.draft, focused: $focused)
                .focused($focused)
                .padding(.bottom, 14)
        }
        .padding(.leading, 16)
        .padding(.trailing, 10)
        .ignoresSafeArea(.container, edges: .bottom)
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
                guard appState.route == .composer else { return }
                appState.composerFocused = true
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
                Text("New thread")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(.white)

                Text(appState.activeWorkspace.rawValue)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(.white.opacity(0.58))
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

private struct PromptBar: View {
    @Binding var text: String
    @FocusState.Binding var focused: Bool

    var body: some View {
        VStack(spacing: 14) {
            TextField("Ask Codex", text: $text, axis: .vertical)
                .focused($focused)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(.white)
                .tint(.white)
                .lineLimit(1...4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
                .padding(.trailing, 10)
                .padding(.top, 12)
                .accessibilityLabel("Prompt")
                .accessibilityHint("Type what you want to work on")

            HStack(spacing: 10) {
                Button {} label: {
                    Image(systemName: "plus")
                        .font(.system(size: 19, weight: .regular))
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Add attachment")

                Button {} label: {
                    Image(systemName: "exclamationmark.shield")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(.orange)
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Security mode")

                Spacer()

                Text("5.5 Medium")
                    .font(.system(size: 15, weight: .regular))
                    .lineLimit(1)
                    .frame(height: 32)
                    .accessibilityLabel("Model 5.5 Medium")

                Button {} label: {
                    Image(systemName: "mic")
                        .font(.system(size: 18, weight: .regular))
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Voice input")

                Button {} label: {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(text.isEmpty ? .white.opacity(0.62) : .black)
                        .frame(width: 36, height: 36)
                        .glassProminentCircle(enabled: !text.isEmpty)
                }
                .accessibilityLabel("Send message")
                .accessibilityHint(text.isEmpty ? "Enter a prompt before sending" : "")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white)
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
    ComposerView()
        .environment(AppState())
        .preferredColorScheme(.dark)
}
