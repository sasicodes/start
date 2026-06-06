import Foundation

enum AppRoute: Hashable {
    case home
    case newChat
    case chat(UUID)
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

struct Chat: Identifiable {
    let id: UUID
    let title: String
    let workspace: Workspace
    let updatedAt: String
    var branchName: String { workspace.branchName }
    var projectName: String { workspace.rawValue }

    static let samples = [
        Chat(id: UUID(), title: "Mobile relay settings", workspace: .start, updatedAt: "Now"),
        Chat(id: UUID(), title: "Review prompt spacing", workspace: .start, updatedAt: "4m"),
        Chat(id: UUID(), title: "Pair iPhone relay", workspace: .start, updatedAt: "9m"),
        Chat(id: UUID(), title: "Chat polish pass", workspace: .start, updatedAt: "18m"),
        Chat(id: UUID(), title: "Glass controls audit", workspace: .start, updatedAt: "32m"),
        Chat(id: UUID(), title: "Keyboard transition fix", workspace: .start, updatedAt: "45m"),
        Chat(id: UUID(), title: "Chat list layout", workspace: .start, updatedAt: "1h"),
        Chat(id: UUID(), title: "Mobile preview notes", workspace: .start, updatedAt: "2h"),
        Chat(id: UUID(), title: "Home screen alignment", workspace: .start, updatedAt: "3h"),
        Chat(id: UUID(), title: "Provider picker idea", workspace: .start, updatedAt: "5h"),
        Chat(id: UUID(), title: "Release notes draft", workspace: .start, updatedAt: "7h"),
        Chat(id: UUID(), title: "Local cache cleanup", workspace: .start, updatedAt: "9h"),
        Chat(id: UUID(), title: "Settings copy review", workspace: .start, updatedAt: "11h"),
        Chat(id: UUID(), title: "Thread detail sketch", workspace: .start, updatedAt: "1d"),
        Chat(id: UUID(), title: "Empty state polish", workspace: .start, updatedAt: "1d"),
        Chat(id: UUID(), title: "Voice input affordance", workspace: .start, updatedAt: "2d"),
        Chat(id: UUID(), title: "Keyboard focus timing", workspace: .start, updatedAt: "2d"),
        Chat(id: UUID(), title: "Compact toolbar pass", workspace: .start, updatedAt: "3d"),
        Chat(id: UUID(), title: "Prompt placeholder ideas", workspace: .start, updatedAt: "3d"),
        Chat(id: UUID(), title: "Recent files cleanup", workspace: .start, updatedAt: "4d"),
        Chat(id: UUID(), title: "Thread search sketch", workspace: .start, updatedAt: "4d"),
        Chat(id: UUID(), title: "Mobile settings audit", workspace: .start, updatedAt: "5d"),
        Chat(id: UUID(), title: "Agent status layout", workspace: .start, updatedAt: "5d"),
        Chat(id: UUID(), title: "Local model picker notes", workspace: .start, updatedAt: "6d"),
        Chat(id: UUID(), title: "Chat send behavior", workspace: .start, updatedAt: "6d"),
        Chat(id: UUID(), title: "Device install checklist", workspace: .start, updatedAt: "1w"),
        Chat(id: UUID(), title: "Personal relay archive", workspace: .start, updatedAt: "1w"),
        Chat(id: UUID(), title: "Diff panel follow-up", workspace: .relay, updatedAt: "12m"),
        Chat(id: UUID(), title: "Desktop pairing test", workspace: .relay, updatedAt: "26m"),
        Chat(id: UUID(), title: "Relay server deploy", workspace: .relay, updatedAt: "41m"),
        Chat(id: UUID(), title: "Workspace access review", workspace: .relay, updatedAt: "58m"),
        Chat(id: UUID(), title: "Provider auth bug", workspace: .relay, updatedAt: "2h"),
        Chat(id: UUID(), title: "Usage telemetry pass", workspace: .relay, updatedAt: "4h"),
        Chat(id: UUID(), title: "Window behavior notes", workspace: .relay, updatedAt: "6h"),
        Chat(id: UUID(), title: "Subagent activity cleanup", workspace: .relay, updatedAt: "8h"),
        Chat(id: UUID(), title: "Browser inspect task", workspace: .relay, updatedAt: "10h"),
        Chat(id: UUID(), title: "Shortcut command design", workspace: .relay, updatedAt: "13h"),
        Chat(id: UUID(), title: "Model settings migration", workspace: .relay, updatedAt: "16h"),
        Chat(id: UUID(), title: "Error surface copy", workspace: .relay, updatedAt: "20h"),
        Chat(id: UUID(), title: "Build verification notes", workspace: .relay, updatedAt: "1d"),
        Chat(id: UUID(), title: "Release checklist review", workspace: .relay, updatedAt: "1d"),
        Chat(id: UUID(), title: "Team onboarding notes", workspace: .relay, updatedAt: "2d"),
        Chat(id: UUID(), title: "Staging relay incident", workspace: .relay, updatedAt: "2d"),
        Chat(id: UUID(), title: "Connection status design", workspace: .relay, updatedAt: "3d"),
        Chat(id: UUID(), title: "App signing cleanup", workspace: .relay, updatedAt: "3d"),
        Chat(id: UUID(), title: "Project generator pass", workspace: .relay, updatedAt: "4d"),
        Chat(id: UUID(), title: "Access token rotation", workspace: .relay, updatedAt: "4d"),
        Chat(id: UUID(), title: "Office workspace archive", workspace: .relay, updatedAt: "5d"),
        Chat(id: UUID(), title: "Review queue triage", workspace: .relay, updatedAt: "5d"),
        Chat(id: UUID(), title: "Design sync summary", workspace: .relay, updatedAt: "6d"),
        Chat(id: UUID(), title: "Security review notes", workspace: .relay, updatedAt: "6d"),
        Chat(id: UUID(), title: "Xcode warning audit", workspace: .relay, updatedAt: "1w"),
        Chat(id: UUID(), title: "Office relay backlog", workspace: .relay, updatedAt: "1w"),
        Chat(id: UUID(), title: "Window chrome alignment", workspace: .desktop, updatedAt: "15m"),
        Chat(id: UUID(), title: "Browser panel toolbar", workspace: .desktop, updatedAt: "38m"),
        Chat(id: UUID(), title: "Chat dock behavior", workspace: .desktop, updatedAt: "1h"),
        Chat(id: UUID(), title: "Settings panel cleanup", workspace: .desktop, updatedAt: "3h"),
        Chat(id: UUID(), title: "Markdown rendering pass", workspace: .desktop, updatedAt: "6h"),
        Chat(id: UUID(), title: "Home recents grouping", workspace: .ios, updatedAt: "8m"),
        Chat(id: UUID(), title: "Accordion motion tuning", workspace: .ios, updatedAt: "19m"),
        Chat(id: UUID(), title: "Bottom compose placement", workspace: .ios, updatedAt: "27m"),
        Chat(id: UUID(), title: "System theme audit", workspace: .ios, updatedAt: "53m"),
        Chat(id: UUID(), title: "Prompt bar focus timing", workspace: .ios, updatedAt: "2h"),
        Chat(id: UUID(), title: "Landing page copy", workspace: .web, updatedAt: "22m"),
        Chat(id: UUID(), title: "Download CTA layout", workspace: .web, updatedAt: "1h"),
        Chat(id: UUID(), title: "Pricing section notes", workspace: .web, updatedAt: "4h"),
        Chat(id: UUID(), title: "Public domain routing", workspace: .web, updatedAt: "8h"),
        Chat(id: UUID(), title: "SEO metadata pass", workspace: .web, updatedAt: "12h"),
        Chat(id: UUID(), title: "Release guide draft", workspace: .docs, updatedAt: "31m"),
        Chat(id: UUID(), title: "Relay setup steps", workspace: .docs, updatedAt: "2h"),
        Chat(id: UUID(), title: "Mobile pairing docs", workspace: .docs, updatedAt: "5h"),
        Chat(id: UUID(), title: "Troubleshooting section", workspace: .docs, updatedAt: "9h"),
        Chat(id: UUID(), title: "Changelog cleanup", workspace: .docs, updatedAt: "1d")
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

struct WorkspaceChatSection: Identifiable {
    let workspace: Workspace
    let chats: [Chat]

    var id: Workspace { workspace }
}

func workspaceChatSections(
    from chats: [Chat],
    sort: WorkspaceSort = .recent,
    limit: Int = 5
) -> [WorkspaceChatSection] {
    let chatsByWorkspace = Dictionary(grouping: chats, by: \.workspace)
    let workspaces: [Workspace]

    switch sort {
    case .recent:
        workspaces = Workspace.allCases
    case .alphabetical:
        workspaces = Workspace.allCases.sorted { $0.rawValue.localizedStandardCompare($1.rawValue) == .orderedAscending }
    }

    return workspaces.compactMap { workspace in
        guard let chats = chatsByWorkspace[workspace] else { return nil }
        let workspaceChats = chats.prefix(limit)
        guard !workspaceChats.isEmpty else { return nil }
        return WorkspaceChatSection(workspace: workspace, chats: Array(workspaceChats))
    }
}

enum ChatMessageRole: String {
    case agent = "Agent"
    case user = "You"
}

struct ChatMessage: Identifiable {
    let id: String
    let role: ChatMessageRole
    let text: String

    static func samples(for chat: Chat) -> [ChatMessage] {
        [
            ChatMessage(id: "\(chat.id)-0", role: .user, text: "Open \(chat.title.lowercased()) and summarize what is still unresolved."),
            ChatMessage(id: "\(chat.id)-1", role: .agent, text: "I checked the latest thread state. The main remaining work is spacing, tap comfort, and making the mobile flow feel more native."),
            ChatMessage(id: "\(chat.id)-2", role: .user, text: "Keep the interface direct and avoid adding extra chrome."),
            ChatMessage(id: "\(chat.id)-3", role: .agent, text: "Understood. I kept the list text-forward, preserved the floating compose action, and avoided card styling for the history."),
            ChatMessage(id: "\(chat.id)-4", role: .user, text: "Make sure the prompt still feels easy to reach."),
            ChatMessage(id: "\(chat.id)-5", role: .agent, text: "The bottom action now uses a compact Liquid Glass capsule with matched edge padding. It should feel reachable without crowding the screen corner."),
            ChatMessage(id: "\(chat.id)-6", role: .user, text: "What about the connection menu?"),
            ChatMessage(id: "\(chat.id)-7", role: .agent, text: "Connections live under the top more menu. Online devices use a soft green laptop, offline devices use a soft red laptop, and the selected device gets a small check badge."),
            ChatMessage(id: "\(chat.id)-8", role: .user, text: "Can the history scroll cleanly with more content?"),
            ChatMessage(id: "\(chat.id)-9", role: .agent, text: "Yes. The message stack has compact spacing, the top and bottom fades stay passive, and the prompt remains pinned below the conversation."),
            ChatMessage(id: "\(chat.id)-10", role: .agent, text: "Next step is to run it on a physical phone and tune only the last few points of safe-area spacing if the hardware corner radius changes the feel.")
        ]
    }
}

struct Connection: Identifiable {
    let id: UUID
    let desktopId: String
    let workspace: Workspace
    let downloadSpeed: String
    let uploadSpeed: String
    var name: String
    var enabled: Bool

    init(
        id: UUID = UUID(),
        desktopId: String,
        name: String,
        workspace: Workspace,
        downloadSpeed: String = "0 KB/s",
        uploadSpeed: String = "0 KB/s",
        enabled: Bool
    ) {
        self.id = id
        self.name = name
        self.enabled = enabled
        self.desktopId = desktopId
        self.workspace = workspace
        self.uploadSpeed = uploadSpeed
        self.downloadSpeed = downloadSpeed
    }

    init(pairing: PairingPayload) {
        let fallbackName = String(pairing.desktopId.prefix(8))
        let trimmedName = pairing.desktopName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        self.init(
            desktopId: pairing.desktopId,
            name: trimmedName.isEmpty ? "Desktop \(fallbackName)" : trimmedName,
            workspace: .start,
            enabled: true
        )
    }

    var speedLabel: String {
        guard enabled else { return "Offline" }
        return "↓ \(downloadSpeed)  ↑ \(uploadSpeed)"
    }

    var state: ConnectionState {
        enabled ? .online : .offline
    }

    static let samples = [
        Connection(desktopId: "personal", name: "Personal", workspace: .start, downloadSpeed: "1.8 MB/s", uploadSpeed: "420 KB/s", enabled: true),
        Connection(desktopId: "office", name: "Office", workspace: .relay, enabled: false),
        Connection(desktopId: "design", name: "Design", workspace: .start, downloadSpeed: "940 KB/s", uploadSpeed: "180 KB/s", enabled: true),
        Connection(desktopId: "staging", name: "Staging", workspace: .relay, enabled: false)
    ]
}
