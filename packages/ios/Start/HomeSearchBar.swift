import SwiftUI

struct HomeSearchBar: View {
    @Binding var text: String
    @FocusState.Binding var focused: Bool

    private var active: Bool {
        focused || !text.isEmpty
    }

    var body: some View {
        HStack(spacing: active ? 6 : 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink.opacity(0.82))

                TextField(
                    "",
                    text: $text,
                    prompt: Text("Search")
                        .foregroundStyle(StartTheme.Colors.ink.opacity(0.62))
                )
                .focused($focused)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(StartTheme.Colors.ink)
                .tint(StartTheme.Colors.ink)
                .submitLabel(.search)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .accessibilityLabel("Search chats")
                .onSubmit {
                    focused = false
                }
            }
            .frame(maxWidth: .infinity, minHeight: StartTheme.Metrics.floatingButtonHitSize)
            .padding(.leading, 16)
            .padding(.trailing, 14)
            .contentShape(Capsule())
            .glassSearchCapsule(active: active)
            .simultaneousGesture(
                TapGesture().onEnded {
                    focused = true
                }
            )

            if active {
                Button {
                    StartHaptics.lightImpact()
                    withAnimation(.snappy(duration: 0.14, extraBounce: 0)) {
                        text = ""
                        focused = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink.opacity(0.84))
                        .frame(width: StartTheme.Metrics.floatingButtonHitSize, height: StartTheme.Metrics.floatingButtonHitSize)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .glassSearchCapsule(active: true)
                .accessibilityLabel("Close search")
                .transition(.searchBubbleSplit)
                .zIndex(1)
            }
        }
        .animation(.snappy(duration: 0.14, extraBounce: 0), value: active)
    }
}

private struct SearchBubbleSplitModifier: ViewModifier {
    let active: Bool

    func body(content: Content) -> some View {
        content
            .scaleEffect(active ? 1 : 0.82, anchor: .leading)
            .offset(x: active ? 0 : -18)
            .opacity(active ? 1 : 0)
    }
}

private extension AnyTransition {
    static var searchBubbleSplit: AnyTransition {
        .asymmetric(
            insertion: .modifier(
                active: SearchBubbleSplitModifier(active: false),
                identity: SearchBubbleSplitModifier(active: true)
            ),
            removal: .modifier(
                active: SearchBubbleSplitModifier(active: false),
                identity: SearchBubbleSplitModifier(active: true)
            )
        )
    }
}
