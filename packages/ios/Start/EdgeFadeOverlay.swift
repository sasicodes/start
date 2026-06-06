import SwiftUI

struct EdgeFadeOverlay: View {
    var topHeight: CGFloat = 52
    var bottomHeight: CGFloat = 78

    var body: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [
                    StartTheme.Colors.background.opacity(0.92),
                    StartTheme.Colors.background.opacity(0.56),
                    .clear
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: topHeight)

            Spacer(minLength: 0)

            LinearGradient(
                colors: [
                    .clear,
                    StartTheme.Colors.background.opacity(0.56),
                    StartTheme.Colors.background.opacity(0.94)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: bottomHeight)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
