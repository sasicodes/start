import SwiftUI

enum StartTheme {
    enum Metrics {
        static let floatingButtonBottomPadding: CGFloat = 24
        static let floatingButtonSize: CGFloat = 50
        static let cornerButtonPadding: CGFloat = 18
        static let pagePadding: CGFloat = 18
        static let sessionListTopPadding: CGFloat = 12
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
