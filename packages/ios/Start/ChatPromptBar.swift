import SwiftUI
import UIKit

private let effortLevelOrder = ["low", "medium", "high", "xhigh"]

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

            HStack(spacing: 8) {
                modelMenu

                effortButton

                Spacer()

                Button(action: send) {
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
    }

    private var modelMenu: some View {
        Menu {
            ForEach(modelGroups) { group in
                Section {
                    ForEach(group.models) { model in
                        Button {
                            UISelectionFeedbackGenerator().selectionChanged()
                            appState.selectModel(model.key)
                        } label: {
                            modelRow(model)
                        }
                    }
                } header: {
                    Label {
                        Text(group.name)
                    } icon: {
                        ProviderAssetIcon(providerID: group.id, size: 15)
                    }
                }
            }
        } label: {
            ProviderAssetIcon(providerID: selectedProviderID, size: 17)
                .frame(width: 32, height: 32)
        }
        .disabled(appState.models.isEmpty)
        .accessibilityLabel("Model")
        .opacity(appState.models.isEmpty ? 0.44 : 1)
    }

    @ViewBuilder
    private func modelRow(_ model: RemoteModel) -> some View {
        if model.key == appState.selectedModelKey {
            Label(model.name, systemImage: "checkmark")
        } else {
            Text(model.name)
        }
    }

    private var effortButton: some View {
        Button(action: selectNextEffortLevel) {
            EffortSignal(activeCount: activeEffortCount)
                .frame(width: 32, height: 32)
        }
        .accessibilityHint(canCycleEffort ? "Cycles effort level" : "")
        .accessibilityLabel("Effort \(activeEffortLabel)")
        .disabled(!canCycleEffort)
        .opacity(currentEffortLevels.isEmpty ? 0.38 : 1)
    }

    private var currentEffortLevels: [String] {
        selectedModel?.effortLevels ?? []
    }

    private var modelGroups: [ModelProviderGroup] {
        modelProviderGroups(from: appState.models)
    }

    private var selectedModel: RemoteModel? {
        appState.models.first { $0.key == appState.selectedModelKey } ?? appState.models.first
    }

    private var selectedProviderID: ModelProviderID {
        selectedModel?.providerID ?? .openai
    }

    private var activeEffortCount: Int {
        guard let index = effortLevelOrder.firstIndex(of: activeEffortLevel) else { return 0 }
        return index + 1
    }

    private var activeEffortLabel: String {
        effortLabel(for: activeEffortLevel)
    }

    private var activeEffortLevel: String {
        if currentEffortLevels.contains(appState.thinkingLevel) {
            return appState.thinkingLevel
        }
        return orderedEffortLevels.first ?? ""
    }

    private var canCycleEffort: Bool {
        orderedEffortLevels.count > 1
    }

    private var orderedEffortLevels: [String] {
        let knownLevels = effortLevelOrder.filter { currentEffortLevels.contains($0) }
        let unknownLevels = currentEffortLevels.filter { !effortLevelOrder.contains($0) }
        return knownLevels + unknownLevels
    }

    private func effortLabel(for level: String) -> String {
        if level == "xhigh" { return "Extra high" }
        if level.isEmpty { return "Unavailable" }
        return level.capitalized
    }

    private func selectNextEffortLevel() {
        guard canCycleEffort else { return }

        let currentIndex = orderedEffortLevels.firstIndex(of: appState.thinkingLevel) ?? -1
        let nextIndex = (currentIndex + 1) % orderedEffortLevels.count

        UISelectionFeedbackGenerator().selectionChanged()
        appState.selectThinkingLevel(orderedEffortLevels[nextIndex])
    }

    private func send() {
        guard sendEnabled else { return }

        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        onSend()
    }
}

private struct EffortSignal: View {
    let activeCount: Int

    var body: some View {
        HStack(alignment: .center, spacing: 2) {
            ForEach(0..<effortLevelOrder.count, id: \.self) { index in
                Capsule()
                    .fill(StartTheme.Colors.ink.opacity(index < activeCount ? 0.82 : 0.25))
                    .frame(width: 2, height: 10)
            }
        }
        .accessibilityHidden(true)
    }
}

private struct ProviderAssetIcon: View {
    let providerID: ModelProviderID
    let size: CGFloat

    var body: some View {
        Image(providerID.iconName)
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .foregroundStyle(StartTheme.Colors.ink)
            .frame(width: size, height: size)
    }
}
