import SwiftUI

struct GlassIconButton: View {
    let systemName: String
    let accessibilityLabel: String
    let action: () -> Void
    var iconSize: CGFloat = StartTheme.Metrics.floatingButtonIconSize
    var size: CGFloat = StartTheme.Metrics.floatingButtonSize

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: size, height: size)
        }
        .accessibilityLabel(accessibilityLabel)
        .buttonStyle(.plain)
        .glassCircle()
    }
}

extension View {
    func glassCircle() -> some View {
        glassEffect(.regular.interactive(), in: .circle)
    }

    func glassProminentCircle(enabled: Bool = true) -> some View {
        glassEffect(.regular.tint(.white.opacity(enabled ? 0.72 : 0.18)).interactive(), in: .circle)
    }

    func glassCapsule(selected: Bool = false) -> some View {
        glassEffect(.regular.tint(.white.opacity(selected ? 0.32 : 0.08)).interactive(), in: .capsule)
    }

    func glassRoundedRectangle(cornerRadius: CGFloat) -> some View {
        glassEffect(.regular.interactive(), in: .rect(cornerRadius: cornerRadius))
    }

    func glassPanel(cornerRadius: CGFloat) -> some View {
        glassEffect(.regular.tint(.white.opacity(0.12)), in: .rect(cornerRadius: cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(.white.opacity(0.16), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.24), radius: 24, y: 14)
    }
}
