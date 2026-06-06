import SwiftUI

struct EdgeFadeOverlay: View {
    var topHeight: CGFloat = 52
    var topSolidHeight: CGFloat = 0
    var bottomHeight: CGFloat = 78

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 0) {
                if topSolidHeight > 0 {
                    Rectangle()
                        .fill(StartTheme.Colors.background.opacity(0.94))
                        .frame(height: topSolidHeight)
                }

                LinearGradient(
                    colors: [
                        StartTheme.Colors.background.opacity(0.94),
                        StartTheme.Colors.background.opacity(0.6),
                        .clear
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: topHeight)
            }

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
