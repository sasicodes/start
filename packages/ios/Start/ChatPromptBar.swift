import SwiftUI
import UniformTypeIdentifiers

struct ChatPromptFooter: View {
    @Environment(AppState.self) private var appState
    @Binding var text: String
    @FocusState.Binding var focused: Bool

    let onSend: () -> Void
    let accessibilityHint: String
    let accessibilityLabel: String
    let placeholder: String

    var body: some View {
        ChatPromptBar(
            text: $text,
            focused: $focused,
            onSend: onSend,
            accessibilityHint: accessibilityHint,
            accessibilityLabel: accessibilityLabel,
            placeholder: placeholder
        )
        .overlay(alignment: .bottom) {
            Text(appState.connectionStatusLabel)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(StartTheme.Colors.softInk.opacity(0.48))
                .contentTransition(.opacity)
                .animation(.easeInOut(duration: 0.16), value: appState.connectionStatusLabel)
                .frame(maxWidth: .infinity, alignment: .center)
                .offset(y: 27)
                .accessibilityLabel("Connection status: \(appState.connectionStatusLabel)")
        }
    }
}

struct ChatPromptBar: View {
    @Environment(AppState.self) private var appState
    @Binding var text: String
    @FocusState.Binding var focused: Bool
    @State private var filePickerOpen = false
    @State private var selectedFileURLs: [URL] = []

    let onSend: () -> Void
    let accessibilityHint: String
    let accessibilityLabel: String
    let placeholder: String

    private var sendEnabled: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 14) {
            TextField(placeholder, text: $text, axis: .vertical)
                .focused($focused)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .tint(StartTheme.Colors.ink)
                .lineLimit(1...4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
                .padding(.trailing, 10)
                .padding(.top, 12)
                .accessibilityLabel(accessibilityLabel)
                .accessibilityHint(accessibilityHint)

            HStack(spacing: 10) {
                modelMenu

                thinkingMenu

                Button {
                    filePickerOpen = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 19, weight: .regular))
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Add attachment")

                Spacer()

                Button(action: onSend) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(sendEnabled ? Color.white : StartTheme.Colors.softInk)
                        .frame(width: 36, height: 36)
                        .glassProminentCircle(enabled: sendEnabled)
                }
                .accessibilityLabel("Send message")
                .accessibilityHint(sendEnabled ? "" : "Enter a message before sending")
                .disabled(!sendEnabled)
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
        .fileImporter(
            isPresented: $filePickerOpen,
            allowedContentTypes: [.item],
            allowsMultipleSelection: true
        ) { result in
            switch result {
            case let .success(urls):
                selectedFileURLs = urls
            case .failure:
                selectedFileURLs = []
            }
        }
    }

    private var modelMenu: some View {
        Menu {
            ForEach(appState.models) { model in
                Button {
                    appState.selectModel(model.key)
                } label: {
                    Label(model.name, systemImage: model.key == appState.selectedModelKey ? "checkmark" : "cpu")
                }
            }
        } label: {
            Image(systemName: "cpu")
                .font(.system(size: 17, weight: .regular))
                .frame(width: 32, height: 32)
        }
        .disabled(appState.models.isEmpty)
        .accessibilityLabel("Model")
    }

    private var thinkingMenu: some View {
        Menu {
            ForEach(currentEffortLevels, id: \.self) { level in
                Button {
                    appState.selectThinkingLevel(level)
                } label: {
                    Label(level.capitalized, systemImage: level == appState.thinkingLevel ? "checkmark" : "speedometer")
                }
            }
        } label: {
            Image(systemName: "speedometer")
                .font(.system(size: 17, weight: .regular))
                .frame(width: 32, height: 32)
        }
        .disabled(currentEffortLevels.isEmpty)
        .accessibilityLabel("Effort")
    }

    private var currentEffortLevels: [String] {
        let selected = appState.models.first { $0.key == appState.selectedModelKey }
        return selected?.effortLevels ?? []
    }
}
