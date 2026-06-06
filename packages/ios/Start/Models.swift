import Foundation

enum AppRoute: Hashable {
    case home
    case newSession
    case session(UUID)
}

enum Workspace: String, CaseIterable, Identifiable {
    case start = "start"
    case relay = "relay"
    case desktop = "desktop"
    case ios = "ios"
    case web = "web"
    case docs = "docs"

    var branchName: String {
        switch self {
        case .start, .ios:
            "main"
        case .relay:
            "deploy"
        case .desktop:
            "ui-polish"
        case .web:
            "site"
        case .docs:
            "guides"
        }
    }

    var id: String { rawValue }
}

enum ConnectionState {
    case online
    case offline
}

struct Session: Identifiable {
    let id: UUID
    let title: String
    let workspace: Workspace
    let updatedAt: String
    var branchName: String { workspace.branchName }
    var projectName: String { workspace.rawValue }

    static let samples = [
        Session(id: UUID(), title: "Mobile relay settings", workspace: .start, updatedAt: "Now"),
        Session(id: UUID(), title: "Review prompt spacing", workspace: .start, updatedAt: "4m"),
        Session(id: UUID(), title: "Pair iPhone relay", workspace: .start, updatedAt: "9m"),
        Session(id: UUID(), title: "Session polish pass", workspace: .start, updatedAt: "18m"),
        Session(id: UUID(), title: "Glass controls audit", workspace: .start, updatedAt: "32m"),
        Session(id: UUID(), title: "Keyboard transition fix", workspace: .start, updatedAt: "45m"),
        Session(id: UUID(), title: "Session list layout", workspace: .start, updatedAt: "1h"),
        Session(id: UUID(), title: "Mobile preview notes", workspace: .start, updatedAt: "2h"),
        Session(id: UUID(), title: "Home screen alignment", workspace: .start, updatedAt: "3h"),
        Session(id: UUID(), title: "Provider picker idea", workspace: .start, updatedAt: "5h"),
        Session(id: UUID(), title: "Release notes draft", workspace: .start, updatedAt: "7h"),
        Session(id: UUID(), title: "Local cache cleanup", workspace: .start, updatedAt: "9h"),
        Session(id: UUID(), title: "Settings copy review", workspace: .start, updatedAt: "11h"),
        Session(id: UUID(), title: "Thread detail sketch", workspace: .start, updatedAt: "1d"),
        Session(id: UUID(), title: "Empty state polish", workspace: .start, updatedAt: "1d"),
        Session(id: UUID(), title: "Voice input affordance", workspace: .start, updatedAt: "2d"),
        Session(id: UUID(), title: "Keyboard focus timing", workspace: .start, updatedAt: "2d"),
        Session(id: UUID(), title: "Compact toolbar pass", workspace: .start, updatedAt: "3d"),
        Session(id: UUID(), title: "Prompt placeholder ideas", workspace: .start, updatedAt: "3d"),
        Session(id: UUID(), title: "Recent files cleanup", workspace: .start, updatedAt: "4d"),
        Session(id: UUID(), title: "Thread search sketch", workspace: .start, updatedAt: "4d"),
        Session(id: UUID(), title: "Mobile settings audit", workspace: .start, updatedAt: "5d"),
        Session(id: UUID(), title: "Agent status layout", workspace: .start, updatedAt: "5d"),
        Session(id: UUID(), title: "Local model picker notes", workspace: .start, updatedAt: "6d"),
        Session(id: UUID(), title: "Session send behavior", workspace: .start, updatedAt: "6d"),
        Session(id: UUID(), title: "Device install checklist", workspace: .start, updatedAt: "1w"),
        Session(id: UUID(), title: "Personal relay archive", workspace: .start, updatedAt: "1w"),
        Session(id: UUID(), title: "Diff panel follow-up", workspace: .relay, updatedAt: "12m"),
        Session(id: UUID(), title: "Desktop pairing test", workspace: .relay, updatedAt: "26m"),
        Session(id: UUID(), title: "Relay server deploy", workspace: .relay, updatedAt: "41m"),
        Session(id: UUID(), title: "Workspace access review", workspace: .relay, updatedAt: "58m"),
        Session(id: UUID(), title: "Provider auth bug", workspace: .relay, updatedAt: "2h"),
        Session(id: UUID(), title: "Usage telemetry pass", workspace: .relay, updatedAt: "4h"),
        Session(id: UUID(), title: "Window behavior notes", workspace: .relay, updatedAt: "6h"),
        Session(id: UUID(), title: "Subagent activity cleanup", workspace: .relay, updatedAt: "8h"),
        Session(id: UUID(), title: "Browser inspect task", workspace: .relay, updatedAt: "10h"),
        Session(id: UUID(), title: "Shortcut command design", workspace: .relay, updatedAt: "13h"),
        Session(id: UUID(), title: "Model settings migration", workspace: .relay, updatedAt: "16h"),
        Session(id: UUID(), title: "Error surface copy", workspace: .relay, updatedAt: "20h"),
        Session(id: UUID(), title: "Build verification notes", workspace: .relay, updatedAt: "1d"),
        Session(id: UUID(), title: "Release checklist review", workspace: .relay, updatedAt: "1d"),
        Session(id: UUID(), title: "Team onboarding notes", workspace: .relay, updatedAt: "2d"),
        Session(id: UUID(), title: "Staging relay incident", workspace: .relay, updatedAt: "2d"),
        Session(id: UUID(), title: "Connection status design", workspace: .relay, updatedAt: "3d"),
        Session(id: UUID(), title: "App signing cleanup", workspace: .relay, updatedAt: "3d"),
        Session(id: UUID(), title: "Project generator pass", workspace: .relay, updatedAt: "4d"),
        Session(id: UUID(), title: "Access token rotation", workspace: .relay, updatedAt: "4d"),
        Session(id: UUID(), title: "Office workspace archive", workspace: .relay, updatedAt: "5d"),
        Session(id: UUID(), title: "Review queue triage", workspace: .relay, updatedAt: "5d"),
        Session(id: UUID(), title: "Design sync summary", workspace: .relay, updatedAt: "6d"),
        Session(id: UUID(), title: "Security review notes", workspace: .relay, updatedAt: "6d"),
        Session(id: UUID(), title: "Xcode warning audit", workspace: .relay, updatedAt: "1w"),
        Session(id: UUID(), title: "Office relay backlog", workspace: .relay, updatedAt: "1w"),
        Session(id: UUID(), title: "Window chrome alignment", workspace: .desktop, updatedAt: "15m"),
        Session(id: UUID(), title: "Browser panel toolbar", workspace: .desktop, updatedAt: "38m"),
        Session(id: UUID(), title: "Session dock behavior", workspace: .desktop, updatedAt: "1h"),
        Session(id: UUID(), title: "Settings panel cleanup", workspace: .desktop, updatedAt: "3h"),
        Session(id: UUID(), title: "Markdown rendering pass", workspace: .desktop, updatedAt: "6h"),
        Session(id: UUID(), title: "Home recents grouping", workspace: .ios, updatedAt: "8m"),
        Session(id: UUID(), title: "Accordion motion tuning", workspace: .ios, updatedAt: "19m"),
        Session(id: UUID(), title: "Bottom compose placement", workspace: .ios, updatedAt: "27m"),
        Session(id: UUID(), title: "System theme audit", workspace: .ios, updatedAt: "53m"),
        Session(id: UUID(), title: "Prompt bar focus timing", workspace: .ios, updatedAt: "2h"),
        Session(id: UUID(), title: "Landing page copy", workspace: .web, updatedAt: "22m"),
        Session(id: UUID(), title: "Download CTA layout", workspace: .web, updatedAt: "1h"),
        Session(id: UUID(), title: "Pricing section notes", workspace: .web, updatedAt: "4h"),
        Session(id: UUID(), title: "Public domain routing", workspace: .web, updatedAt: "8h"),
        Session(id: UUID(), title: "SEO metadata pass", workspace: .web, updatedAt: "12h"),
        Session(id: UUID(), title: "Release guide draft", workspace: .docs, updatedAt: "31m"),
        Session(id: UUID(), title: "Relay setup steps", workspace: .docs, updatedAt: "2h"),
        Session(id: UUID(), title: "Mobile pairing docs", workspace: .docs, updatedAt: "5h"),
        Session(id: UUID(), title: "Troubleshooting section", workspace: .docs, updatedAt: "9h"),
        Session(id: UUID(), title: "Changelog cleanup", workspace: .docs, updatedAt: "1d")
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
    let sessions: [Session]

    var id: Workspace { workspace }
}

func workspaceSessionSections(
    from sessions: [Session],
    sort: WorkspaceSort = .recent,
    limit: Int = 5
) -> [WorkspaceSessionSection] {
    let sessionsByWorkspace = Dictionary(grouping: sessions, by: \.workspace)
    let workspaces: [Workspace]

    switch sort {
    case .recent:
        workspaces = Workspace.allCases
    case .alphabetical:
        workspaces = Workspace.allCases.sorted { $0.rawValue.localizedStandardCompare($1.rawValue) == .orderedAscending }
    }

    return workspaces.compactMap { workspace in
        guard let sessions = sessionsByWorkspace[workspace] else { return nil }
        let workspaceSessions = sessions.prefix(limit)
        guard !workspaceSessions.isEmpty else { return nil }
        return WorkspaceSessionSection(workspace: workspace, sessions: Array(workspaceSessions))
    }
}

enum SessionMessageRole: String {
    case agent = "Agent"
    case user = "You"
}

struct SessionMessage: Identifiable {
    let id: String
    let role: SessionMessageRole
    let text: String

    static func samples(for session: Session) -> [SessionMessage] {
        [
            SessionMessage(id: "\(session.id)-0", role: .user, text: "Open \(session.title.lowercased()) and summarize what is still unresolved."),
            SessionMessage(id: "\(session.id)-1", role: .agent, text: "I checked the latest thread state. The main remaining work is spacing, tap comfort, and making the mobile flow feel more native."),
            SessionMessage(id: "\(session.id)-2", role: .user, text: "Keep the interface direct and avoid adding extra chrome."),
            SessionMessage(id: "\(session.id)-3", role: .agent, text: "Understood. I kept the list text-forward, preserved the floating compose action, and avoided card styling for the history."),
            SessionMessage(id: "\(session.id)-4", role: .user, text: "Make sure the prompt still feels easy to reach."),
            SessionMessage(id: "\(session.id)-5", role: .agent, text: "The bottom action now uses a compact Liquid Glass capsule with matched edge padding. It should feel reachable without crowding the screen corner."),
            SessionMessage(id: "\(session.id)-6", role: .user, text: "What about the connection menu?"),
            SessionMessage(id: "\(session.id)-7", role: .agent, text: "Connections live under the top more menu. Online devices use a soft green laptop, offline devices use a soft red laptop, and the selected device gets a small check badge."),
            SessionMessage(id: "\(session.id)-8", role: .user, text: "Can the history scroll cleanly with more content?"),
            SessionMessage(id: "\(session.id)-9", role: .agent, text: "Yes. The message stack has compact spacing, the top and bottom fades stay passive, and the prompt remains pinned below the conversation."),
            SessionMessage(id: "\(session.id)-10", role: .agent, text: "Next step is to run it on a physical phone and tune only the last few points of safe-area spacing if the hardware corner radius changes the feel.")
        ]
    }
}

struct Connection: Identifiable {
    let id: UUID
    let name: String
    let workspace: Workspace
    let downloadSpeed: String
    let uploadSpeed: String
    var enabled: Bool

    var speedLabel: String {
        guard enabled else { return "Offline" }
        return "↓ \(downloadSpeed)  ↑ \(uploadSpeed)"
    }

    var state: ConnectionState {
        enabled ? .online : .offline
    }

    static let samples = [
        Connection(id: UUID(), name: "Personal", workspace: .start, downloadSpeed: "1.8 MB/s", uploadSpeed: "420 KB/s", enabled: true),
        Connection(id: UUID(), name: "Office", workspace: .relay, downloadSpeed: "0 KB/s", uploadSpeed: "0 KB/s", enabled: false),
        Connection(id: UUID(), name: "Design", workspace: .start, downloadSpeed: "940 KB/s", uploadSpeed: "180 KB/s", enabled: true),
        Connection(id: UUID(), name: "Staging", workspace: .relay, downloadSpeed: "0 KB/s", uploadSpeed: "0 KB/s", enabled: false)
    ]
}
