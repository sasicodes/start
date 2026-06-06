import Foundation

enum AppRoute: Hashable {
    case home
    case composer
    case session(UUID)
}

enum Workspace: String, CaseIterable, Identifiable {
    case start = "start"
    case relay = "relay"
    case desktop = "desktop"
    case ios = "ios"
    case web = "web"
    case docs = "docs"

    var id: String { rawValue }
}

enum ConnectionState {
    case online
    case offline
}

struct ChatSession: Identifiable {
    let id: UUID
    let title: String
    let workspace: Workspace
    let updatedAt: String
    var projectName: String { workspace.rawValue }

    static let samples = [
        ChatSession(id: UUID(), title: "Mobile relay settings", workspace: .start, updatedAt: "Now"),
        ChatSession(id: UUID(), title: "Review prompt spacing", workspace: .start, updatedAt: "4m"),
        ChatSession(id: UUID(), title: "Pair iPhone relay", workspace: .start, updatedAt: "9m"),
        ChatSession(id: UUID(), title: "Composer polish pass", workspace: .start, updatedAt: "18m"),
        ChatSession(id: UUID(), title: "Glass controls audit", workspace: .start, updatedAt: "32m"),
        ChatSession(id: UUID(), title: "Keyboard transition fix", workspace: .start, updatedAt: "45m"),
        ChatSession(id: UUID(), title: "Session list layout", workspace: .start, updatedAt: "1h"),
        ChatSession(id: UUID(), title: "Mobile preview notes", workspace: .start, updatedAt: "2h"),
        ChatSession(id: UUID(), title: "Home screen alignment", workspace: .start, updatedAt: "3h"),
        ChatSession(id: UUID(), title: "Provider picker idea", workspace: .start, updatedAt: "5h"),
        ChatSession(id: UUID(), title: "Release notes draft", workspace: .start, updatedAt: "7h"),
        ChatSession(id: UUID(), title: "Local cache cleanup", workspace: .start, updatedAt: "9h"),
        ChatSession(id: UUID(), title: "Settings copy review", workspace: .start, updatedAt: "11h"),
        ChatSession(id: UUID(), title: "Thread detail sketch", workspace: .start, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Empty state polish", workspace: .start, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Voice input affordance", workspace: .start, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Keyboard focus timing", workspace: .start, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Compact toolbar pass", workspace: .start, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "Prompt placeholder ideas", workspace: .start, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "Recent files cleanup", workspace: .start, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Thread search sketch", workspace: .start, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Mobile settings audit", workspace: .start, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Agent status layout", workspace: .start, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Local model picker notes", workspace: .start, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Composer send behavior", workspace: .start, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Device install checklist", workspace: .start, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Personal relay archive", workspace: .start, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Diff panel follow-up", workspace: .relay, updatedAt: "12m"),
        ChatSession(id: UUID(), title: "Desktop pairing test", workspace: .relay, updatedAt: "26m"),
        ChatSession(id: UUID(), title: "Relay server deploy", workspace: .relay, updatedAt: "41m"),
        ChatSession(id: UUID(), title: "Workspace access review", workspace: .relay, updatedAt: "58m"),
        ChatSession(id: UUID(), title: "Provider auth bug", workspace: .relay, updatedAt: "2h"),
        ChatSession(id: UUID(), title: "Usage telemetry pass", workspace: .relay, updatedAt: "4h"),
        ChatSession(id: UUID(), title: "Window behavior notes", workspace: .relay, updatedAt: "6h"),
        ChatSession(id: UUID(), title: "Subagent activity cleanup", workspace: .relay, updatedAt: "8h"),
        ChatSession(id: UUID(), title: "Browser inspect task", workspace: .relay, updatedAt: "10h"),
        ChatSession(id: UUID(), title: "Shortcut command design", workspace: .relay, updatedAt: "13h"),
        ChatSession(id: UUID(), title: "Model settings migration", workspace: .relay, updatedAt: "16h"),
        ChatSession(id: UUID(), title: "Error surface copy", workspace: .relay, updatedAt: "20h"),
        ChatSession(id: UUID(), title: "Build verification notes", workspace: .relay, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Release checklist review", workspace: .relay, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Team onboarding notes", workspace: .relay, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Staging relay incident", workspace: .relay, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Connection status design", workspace: .relay, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "App signing cleanup", workspace: .relay, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "Project generator pass", workspace: .relay, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Access token rotation", workspace: .relay, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Office workspace archive", workspace: .relay, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Review queue triage", workspace: .relay, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Design sync summary", workspace: .relay, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Security review notes", workspace: .relay, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Xcode warning audit", workspace: .relay, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Office relay backlog", workspace: .relay, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Window chrome alignment", workspace: .desktop, updatedAt: "15m"),
        ChatSession(id: UUID(), title: "Browser panel toolbar", workspace: .desktop, updatedAt: "38m"),
        ChatSession(id: UUID(), title: "Composer dock behavior", workspace: .desktop, updatedAt: "1h"),
        ChatSession(id: UUID(), title: "Settings panel cleanup", workspace: .desktop, updatedAt: "3h"),
        ChatSession(id: UUID(), title: "Markdown rendering pass", workspace: .desktop, updatedAt: "6h"),
        ChatSession(id: UUID(), title: "Home recents grouping", workspace: .ios, updatedAt: "8m"),
        ChatSession(id: UUID(), title: "Accordion motion tuning", workspace: .ios, updatedAt: "19m"),
        ChatSession(id: UUID(), title: "Bottom compose placement", workspace: .ios, updatedAt: "27m"),
        ChatSession(id: UUID(), title: "System theme audit", workspace: .ios, updatedAt: "53m"),
        ChatSession(id: UUID(), title: "Prompt bar focus timing", workspace: .ios, updatedAt: "2h"),
        ChatSession(id: UUID(), title: "Landing page copy", workspace: .web, updatedAt: "22m"),
        ChatSession(id: UUID(), title: "Download CTA layout", workspace: .web, updatedAt: "1h"),
        ChatSession(id: UUID(), title: "Pricing section notes", workspace: .web, updatedAt: "4h"),
        ChatSession(id: UUID(), title: "Public domain routing", workspace: .web, updatedAt: "8h"),
        ChatSession(id: UUID(), title: "SEO metadata pass", workspace: .web, updatedAt: "12h"),
        ChatSession(id: UUID(), title: "Release guide draft", workspace: .docs, updatedAt: "31m"),
        ChatSession(id: UUID(), title: "Relay setup steps", workspace: .docs, updatedAt: "2h"),
        ChatSession(id: UUID(), title: "Mobile pairing docs", workspace: .docs, updatedAt: "5h"),
        ChatSession(id: UUID(), title: "Troubleshooting section", workspace: .docs, updatedAt: "9h"),
        ChatSession(id: UUID(), title: "Changelog cleanup", workspace: .docs, updatedAt: "1d")
    ]
}

enum WorkspaceSort: String, CaseIterable, Identifiable {
    case recent
    case alphabetical

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .recent:
            "clock"
        case .alphabetical:
            "line.3.horizontal.decrease"
        }
    }

    var label: String {
        switch self {
        case .recent:
            "Recent first"
        case .alphabetical:
            "Name"
        }
    }
}

struct WorkspaceSessionSection: Identifiable {
    let workspace: Workspace
    let sessions: [ChatSession]

    var id: Workspace { workspace }
}

func workspaceSessionSections(
    from sessions: [ChatSession],
    sort: WorkspaceSort = .recent,
    limit: Int = 5
) -> [WorkspaceSessionSection] {
    let sections: [WorkspaceSessionSection] = Workspace.allCases.compactMap { workspace in
        let workspaceSessions = sessions.filter { $0.workspace == workspace }.prefix(limit)
        guard !workspaceSessions.isEmpty else { return nil }
        return WorkspaceSessionSection(workspace: workspace, sessions: Array(workspaceSessions))
    }

    switch sort {
    case .recent:
        return sections
    case .alphabetical:
        return sections.sorted { $0.workspace.rawValue.localizedStandardCompare($1.workspace.rawValue) == .orderedAscending }
    }
}

enum MessageRole: String {
    case agent = "Agent"
    case user = "You"
}

struct ChatMessage: Identifiable {
    let id: UUID
    let role: MessageRole
    let text: String

    static func samples(for session: ChatSession) -> [ChatMessage] {
        [
            ChatMessage(id: UUID(), role: .user, text: "Open \(session.title.lowercased()) and summarize what is still unresolved."),
            ChatMessage(id: UUID(), role: .agent, text: "I checked the latest thread state. The main remaining work is spacing, tap comfort, and making the mobile flow feel more native."),
            ChatMessage(id: UUID(), role: .user, text: "Keep the interface direct and avoid adding extra chrome."),
            ChatMessage(id: UUID(), role: .agent, text: "Understood. I kept the list text-forward, preserved the floating compose action, and avoided card styling for the history."),
            ChatMessage(id: UUID(), role: .agent, text: "Next step is to run the change on device and tune any spacing that feels off in the real keyboard and safe-area environment.")
        ]
    }
}

struct Connection: Identifiable {
    let id: UUID
    let name: String
    let workspace: Workspace
    var enabled: Bool

    var state: ConnectionState {
        enabled ? .online : .offline
    }

    static let samples = [
        Connection(id: UUID(), name: "Personal", workspace: .start, enabled: true),
        Connection(id: UUID(), name: "Office", workspace: .relay, enabled: false),
        Connection(id: UUID(), name: "Design", workspace: .start, enabled: true),
        Connection(id: UUID(), name: "Staging", workspace: .relay, enabled: false)
    ]
}
