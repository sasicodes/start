import SwiftUI

struct NewChatButton: View {
    let transitionNamespace: Namespace.ID
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            Label("New chat", systemImage: "plus")
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
        .matchedTransitionSource(id: "composer", in: transitionNamespace)
    }
}
