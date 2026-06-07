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
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(width: size, height: size)
        }
        .frame(
            width: max(size, StartTheme.Metrics.floatingButtonHitSize),
            height: max(size, StartTheme.Metrics.floatingButtonHitSize)
        )
        .contentShape(Circle())
        .accessibilityLabel(accessibilityLabel)
        .buttonStyle(.plain)
        .glassCircle()
    }
}

struct ChatHeaderIconButton: View {
    let systemName: String
    let accessibilityLabel: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(StartTheme.Colors.ink)
                .frame(width: 38, height: 38)
        }
        .frame(width: 44, height: 44)
        .contentShape(Circle())
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
        glassEffect(.regular.tint(enabled ? Color.black : StartTheme.Colors.ink.opacity(0.14)).interactive(), in: .circle)
    }

    func glassCapsule(selected: Bool = false) -> some View {
        glassEffect(.regular.tint(StartTheme.Colors.ink.opacity(selected ? 0.16 : 0.02)).interactive(), in: .capsule)
    }

    func glassSearchCapsule(active: Bool = false) -> some View {
        glassEffect(.regular.tint(StartTheme.Colors.ink.opacity(active ? 0.03 : 0.015)).interactive(), in: .capsule)
    }

    func glassRoundedRectangle(cornerRadius: CGFloat) -> some View {
        glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
    }

    func glassPanel(cornerRadius: CGFloat) -> some View {
        glassEffect(.regular.tint(StartTheme.Colors.ink.opacity(0.12)), in: .rect(cornerRadius: cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(StartTheme.Colors.ink.opacity(0.16), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.24), radius: 24, y: 14)
    }
}
