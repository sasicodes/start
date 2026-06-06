import Foundation

enum AppRoute: Hashable {
    case home
    case composer
    case session(UUID)
}

enum Workspace: String, CaseIterable, Identifiable {
    case personal = "Personal"
    case office = "Office"

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

    static let samples = [
        ChatSession(id: UUID(), title: "Mobile relay settings", workspace: .personal, updatedAt: "Now"),
        ChatSession(id: UUID(), title: "Review prompt spacing", workspace: .personal, updatedAt: "4m"),
        ChatSession(id: UUID(), title: "Pair iPhone relay", workspace: .personal, updatedAt: "9m"),
        ChatSession(id: UUID(), title: "Composer polish pass", workspace: .personal, updatedAt: "18m"),
        ChatSession(id: UUID(), title: "Glass controls audit", workspace: .personal, updatedAt: "32m"),
        ChatSession(id: UUID(), title: "Keyboard transition fix", workspace: .personal, updatedAt: "45m"),
        ChatSession(id: UUID(), title: "Session list layout", workspace: .personal, updatedAt: "1h"),
        ChatSession(id: UUID(), title: "Mobile preview notes", workspace: .personal, updatedAt: "2h"),
        ChatSession(id: UUID(), title: "Home screen alignment", workspace: .personal, updatedAt: "3h"),
        ChatSession(id: UUID(), title: "Provider picker idea", workspace: .personal, updatedAt: "5h"),
        ChatSession(id: UUID(), title: "Release notes draft", workspace: .personal, updatedAt: "7h"),
        ChatSession(id: UUID(), title: "Local cache cleanup", workspace: .personal, updatedAt: "9h"),
        ChatSession(id: UUID(), title: "Settings copy review", workspace: .personal, updatedAt: "11h"),
        ChatSession(id: UUID(), title: "Thread detail sketch", workspace: .personal, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Empty state polish", workspace: .personal, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Voice input affordance", workspace: .personal, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Keyboard focus timing", workspace: .personal, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Compact toolbar pass", workspace: .personal, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "Prompt placeholder ideas", workspace: .personal, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "Recent files cleanup", workspace: .personal, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Thread search sketch", workspace: .personal, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Mobile settings audit", workspace: .personal, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Agent status layout", workspace: .personal, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Local model picker notes", workspace: .personal, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Composer send behavior", workspace: .personal, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Device install checklist", workspace: .personal, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Personal relay archive", workspace: .personal, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Diff panel follow-up", workspace: .office, updatedAt: "12m"),
        ChatSession(id: UUID(), title: "Desktop pairing test", workspace: .office, updatedAt: "26m"),
        ChatSession(id: UUID(), title: "Relay server deploy", workspace: .office, updatedAt: "41m"),
        ChatSession(id: UUID(), title: "Workspace access review", workspace: .office, updatedAt: "58m"),
        ChatSession(id: UUID(), title: "Provider auth bug", workspace: .office, updatedAt: "2h"),
        ChatSession(id: UUID(), title: "Usage telemetry pass", workspace: .office, updatedAt: "4h"),
        ChatSession(id: UUID(), title: "Window behavior notes", workspace: .office, updatedAt: "6h"),
        ChatSession(id: UUID(), title: "Subagent activity cleanup", workspace: .office, updatedAt: "8h"),
        ChatSession(id: UUID(), title: "Browser inspect task", workspace: .office, updatedAt: "10h"),
        ChatSession(id: UUID(), title: "Shortcut command design", workspace: .office, updatedAt: "13h"),
        ChatSession(id: UUID(), title: "Model settings migration", workspace: .office, updatedAt: "16h"),
        ChatSession(id: UUID(), title: "Error surface copy", workspace: .office, updatedAt: "20h"),
        ChatSession(id: UUID(), title: "Build verification notes", workspace: .office, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Release checklist review", workspace: .office, updatedAt: "1d"),
        ChatSession(id: UUID(), title: "Team onboarding notes", workspace: .office, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Staging relay incident", workspace: .office, updatedAt: "2d"),
        ChatSession(id: UUID(), title: "Connection status design", workspace: .office, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "App signing cleanup", workspace: .office, updatedAt: "3d"),
        ChatSession(id: UUID(), title: "Project generator pass", workspace: .office, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Access token rotation", workspace: .office, updatedAt: "4d"),
        ChatSession(id: UUID(), title: "Office workspace archive", workspace: .office, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Review queue triage", workspace: .office, updatedAt: "5d"),
        ChatSession(id: UUID(), title: "Design sync summary", workspace: .office, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Security review notes", workspace: .office, updatedAt: "6d"),
        ChatSession(id: UUID(), title: "Xcode warning audit", workspace: .office, updatedAt: "1w"),
        ChatSession(id: UUID(), title: "Office relay backlog", workspace: .office, updatedAt: "1w")
    ]
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
        Connection(id: UUID(), name: "Personal", workspace: .personal, enabled: true),
        Connection(id: UUID(), name: "Office", workspace: .office, enabled: false),
        Connection(id: UUID(), name: "Design", workspace: .personal, enabled: true),
        Connection(id: UUID(), name: "Staging", workspace: .office, enabled: false)
    ]
}
