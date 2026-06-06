import SwiftUI

struct SessionHeaderMetadata: View {
    let branchName: String
    let workspaceName: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "folder")
                .font(.system(size: 11, weight: .medium))

            Text(workspaceName)

            Text("·")
                .foregroundStyle(StartTheme.Colors.softInk.opacity(0.62))

            Image(systemName: "arrow.triangle.branch")
                .font(.system(size: 11, weight: .medium))

            Text(branchName)
        }
        .font(.system(size: 13, weight: .regular))
        .foregroundStyle(StartTheme.Colors.softInk)
        .lineLimit(1)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Workspace \(workspaceName), branch \(branchName)")
    }
}
