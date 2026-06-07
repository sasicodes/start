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
        workspaceLeafName(for: workspacePath)
    }

    var projectName: String { workspaceName }

    var updatedAt: String {
        relativeTimeLabel(for: modified)
    }
}

func workspaceLeafName(for path: String) -> String {
    let name = URL(fileURLWithPath: path).lastPathComponent
    return name.isEmpty ? "workspace" : name
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

enum ModelProviderID: String, CaseIterable, Identifiable {
    case openai
    case anthropic
    case google

    var id: String { rawValue }

    var iconName: String {
        switch self {
        case .openai:
            "provider-openai"
        case .anthropic:
            "provider-anthropic"
        case .google:
            "provider-gemini"
        }
    }

    var label: String {
        switch self {
        case .openai:
            "OpenAI"
        case .anthropic:
            "Anthropic"
        case .google:
            "Google"
        }
    }
}

struct RemoteModel: Codable, Identifiable {
    let key: String
    let name: String
    let provider: String
    let reasoning: Bool
    let effortLevels: [String]

    var id: String { key }
    var providerID: ModelProviderID { modelProviderID(for: self) }

    init(
        key: String,
        name: String,
        provider: String = "",
        reasoning: Bool,
        effortLevels: [String]
    ) {
        self.key = key
        self.name = name
        self.provider = provider
        self.reasoning = reasoning
        self.effortLevels = effortLevels
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        key = try container.decode(String.self, forKey: .key)
        name = try container.decode(String.self, forKey: .name)
        provider = try container.decodeIfPresent(String.self, forKey: .provider) ?? ""
        reasoning = try container.decode(Bool.self, forKey: .reasoning)
        effortLevels = try container.decode([String].self, forKey: .effortLevels)
    }

    private enum CodingKeys: String, CodingKey {
        case key
        case name
        case provider
        case reasoning
        case effortLevels
    }
}

struct ModelProviderGroup: Identifiable {
    let id: ModelProviderID
    let models: [RemoteModel]

    var name: String { id.label }
}

func modelProviderGroups(from models: [RemoteModel]) -> [ModelProviderGroup] {
    let grouped = Dictionary(grouping: models, by: \.providerID)

    return ModelProviderID.allCases.compactMap { providerID in
        guard let models = grouped[providerID], !models.isEmpty else { return nil }
        return ModelProviderGroup(id: providerID, models: models)
    }
}

func modelProviderID(for model: RemoteModel) -> ModelProviderID {
    if let providerID = ModelProviderID(rawValue: model.provider.lowercased()) {
        return providerID
    }

    let haystack = "\(model.provider) \(model.key) \(model.name)".lowercased()
    if ["gemini", "google"].contains(where: { haystack.contains($0) }) {
        return .google
    }
    if ["gpt", "openai", "o3", "o4"].contains(where: { haystack.contains($0) }) {
        return .openai
    }
    return .anthropic
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
