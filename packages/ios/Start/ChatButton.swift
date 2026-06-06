import SwiftUI

struct ChatButton: View {
    let transitionNamespace: Namespace.ID
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            Label("Chat", systemImage: "plus")
                .font(.system(size: 16, weight: .semibold))
                .labelStyle(.titleAndIcon)
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(height: StartTheme.Metrics.floatingButtonHitSize)
                .padding(.horizontal, 18)
        }
        .accessibilityLabel("New chat")
        .buttonStyle(.plain)
        .contentShape(Capsule())
        .glassCapsule()
        .matchedTransitionSource(id: "new-chat", in: transitionNamespace)
    }
}
