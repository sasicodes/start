import SwiftUI

struct ComposerView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var focused: Bool

    var body: some View {
        @Bindable var appState = appState

        VStack(spacing: 0) {
            header
                .zIndex(1)

            Spacer(minLength: 24)

            VStack(spacing: 8) {
                Text("What should we work on?")
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.ink)

                HStack(spacing: 8) {
                    Image(systemName: "folder")
                    Text("start")
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                }
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(StartTheme.Colors.softInk)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Workspace start")
            }
            .padding(.bottom, 86)

            PromptBar(text: $appState.draft, focused: $focused)
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
            appState.composerFocused = false
        }
        .onChange(of: appState.composerFocused) { _, value in
            focused = value
        }
        .onChange(of: focused) { _, value in
            appState.composerFocused = value
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
                    .foregroundStyle(StartTheme.Colors.ink)

                Text(appState.activeProjectName)
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
        let expanded = focused || !text.isEmpty

        VStack(spacing: expanded ? 14 : 0) {
            TextField("Ask Codex", text: $text, axis: .vertical)
                .focused($focused)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .tint(StartTheme.Colors.ink)
                .lineLimit(expanded ? 1...4 : 1...1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(minHeight: expanded ? 44 : 50)
                .padding(.leading, 16)
                .padding(.trailing, 16)
                .accessibilityLabel("Prompt")
                .accessibilityHint("Type what you want to work on")

            if expanded {
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
                            .foregroundStyle(StartTheme.Colors.caution)
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
                            .foregroundStyle(text.isEmpty ? StartTheme.Colors.softInk : StartTheme.Colors.background)
                            .frame(width: 36, height: 36)
                            .glassProminentCircle(enabled: !text.isEmpty)
                    }
                    .accessibilityLabel("Send message")
                    .accessibilityHint(text.isEmpty ? "Enter a prompt before sending" : "")
                }
                .buttonStyle(.plain)
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 36)
                .padding(.leading, 14)
                .padding(.trailing, 10)
                .padding(.bottom, 8)
                .transition(.opacity)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: expanded ? 96 : 50)
        .glassRoundedRectangle(cornerRadius: expanded ? 24 : 25)
        .animation(.smooth(duration: 0.18), value: expanded)
    }
}

#Preview {
    ComposerView()
        .environment(AppState())
        .preferredColorScheme(.dark)
}
