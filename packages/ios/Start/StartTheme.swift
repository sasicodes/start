import SwiftUI

enum StartTheme {
    enum Colors {
        static let background = Color(.systemBackground)
        static let caution = Color.orange
        static let ink = Color.primary
        static let softInk = Color.secondary
        static let success = Color.green
    }

    enum Metrics {
        static let floatingButtonBottomPadding: CGFloat = 28
        static let floatingButtonHorizontalPadding: CGFloat = 28
        static let floatingButtonIconSize: CGFloat = 17
        static let floatingButtonSize: CGFloat = 50
        static let floatingButtonHitSize: CGFloat = 50
        static let cornerButtonPadding: CGFloat = 18
        static let pagePadding: CGFloat = 18
        static let sessionListTopPadding: CGFloat = 12
        static let homeListBottomPadding = floatingButtonHitSize + floatingButtonHorizontalPadding + 18
    }

    enum Text {
        static let title = Font.system(size: 32, weight: .regular, design: .default)
    }
}

extension ConnectionState {
    var symbolColor: Color {
        switch self {
        case .online:
            Color(red: 0.56, green: 0.89, blue: 0.62)
        case .offline:
            Color(red: 0.96, green: 0.6, blue: 0.6)
        }
    }
}
