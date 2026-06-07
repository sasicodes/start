import Foundation

enum AppRoute: Hashable {
    case home
    case newChat
    case chat(String)
}

enum ConnectionState {
    case online
    case offline
}

struct Chat: Identifiable, Codable {
    let id: String
    let title: String
    let modified: Int
    let workspaceName: String
    let workspacePath: String

    var branchName: String {
        URL(fileURLWithPath: workspacePath).lastPathComponent.isEmpty ? "workspace" : URL(fileURLWithPath: workspacePath).lastPathComponent
    }

    var projectName: String { workspaceName }

    var updatedAt: String {
        relativeTimeLabel(for: modified)
    }
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
    let workspaceName: String
    let workspacePath: String
    let chats: [Chat]

    var id: String { workspacePath }
}

func workspaceChatSections(
    from chats: [Chat],
    sort: WorkspaceSort = .recent,
    limit: Int = Int.max
) -> [WorkspaceChatSection] {
    let chatsByWorkspace = Dictionary(grouping: chats, by: \.workspacePath)
    let workspacePaths: [String]

    switch sort {
    case .recent:
        workspacePaths = chats.reduce(into: []) { result, chat in
            guard !result.contains(chat.workspacePath) else { return }
            result.append(chat.workspacePath)
        }
    case .alphabetical:
        workspacePaths = chatsByWorkspace.keys.sorted { lhs, rhs in
            let leftName = chatsByWorkspace[lhs]?.first?.workspaceName ?? lhs
            let rightName = chatsByWorkspace[rhs]?.first?.workspaceName ?? rhs
            return leftName.localizedStandardCompare(rightName) == .orderedAscending
        }
    }

    return workspacePaths.compactMap { workspacePath in
        guard let chats = chatsByWorkspace[workspacePath],
              let firstChat = chats.first
        else { return nil }
        let workspaceChats = chats.prefix(limit)
        guard !workspaceChats.isEmpty else { return nil }
        return WorkspaceChatSection(
            workspaceName: firstChat.workspaceName,
            workspacePath: workspacePath,
            chats: Array(workspaceChats)
        )
    }
}

enum ChatMessageRole: String, Codable {
    case agent = "Agent"
    case user = "You"
}

struct ChatMessage: Identifiable, Codable {
    let id: String
    let role: ChatMessageRole
    let text: String
    let createdAt: Int
    let durationMs: Int?
    let streaming: Bool
    let thinking: String?

    init(
        id: String,
        role: ChatMessageRole,
        text: String,
        createdAt: Int,
        durationMs: Int? = nil,
        streaming: Bool = false,
        thinking: String? = nil
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
        self.durationMs = durationMs
        self.streaming = streaming
        self.thinking = thinking
    }
}

struct RemoteWorkspace: Codable {
    let name: String
    let path: String
}

struct RemoteSession: Codable {
    let id: String
    let title: String
    let modified: Int
    let workspaceName: String
    let workspacePath: String
}

struct RemoteMessage: Codable {
    let id: String
    let role: String
    let text: String
    let createdAt: Int
    let durationMs: Int?
    let streaming: Bool?
    let thinking: String?
}

struct RemoteModel: Codable, Identifiable {
    let key: String
    let name: String
    let reasoning: Bool
    let effortLevels: [String]

    var id: String { key }
}

enum SessionLoadState: Equatable {
    case idle
    case loading
    case loaded
    case failed(String)
}

struct MessagePageState {
    var loading = false
    var hasMoreOlder = true
    var nextOffset = 0
}

func relativeTimeLabel(for timestamp: Int) -> String {
    let updatedAt = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
    let seconds = max(0, Int(Date().timeIntervalSince(updatedAt)))

    if seconds < 60 { return "Now" }

    let minutes = seconds / 60
    if minutes < 60 { return "\(minutes)m" }

    let hours = minutes / 60
    if hours < 24 { return "\(hours)h" }

    let days = hours / 24
    if days < 7 { return "\(days)d" }

    return "\(days / 7)w"
}

struct Connection: Identifiable {
    let id: UUID
    let desktopId: String
    var name: String
    var enabled: Bool

    init(
        id: UUID = UUID(),
        desktopId: String,
        name: String,
        enabled: Bool
    ) {
        self.id = id
        self.name = name
        self.enabled = enabled
        self.desktopId = desktopId
    }

    init(pairing: PairingPayload) {
        let fallbackName = String(pairing.desktopId.prefix(8))
        let trimmedName = pairing.desktopName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        self.init(
            desktopId: pairing.desktopId,
            name: trimmedName.isEmpty ? "Desktop \(fallbackName)" : trimmedName,
            enabled: true
        )
    }

    var state: ConnectionState {
        enabled ? .online : .offline
    }
}
