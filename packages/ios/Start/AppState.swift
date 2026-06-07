import Foundation
import Observation

@Observable
@MainActor
final class AppState {
    var activeConnectionID: UUID?
    var connections: [Connection]
    var draft = ""
    var searchText = ""
    var promptFocused = false
    var sessionLoadState = SessionLoadState.idle
    var path: [AppRoute] = []
    var relay = RelayClient()
    var chats: [Chat]
    var models: [RemoteModel] = []
    var thinkingLevel = ""
    var selectedModelKey = ""
    var sessionMessages: [String: [ChatMessage]] = [:]
    var messagePageStates: [String: MessagePageState] = [:]
    var activeRemoteWorkspace: RemoteWorkspace?

    private var messageRequestOffsets: [String: Int] = [:]
    private var pendingDrafts: [String: String] = [:]
    private var pendingNewChatTitles: [String: String] = [:]

    init(connections: [Connection] = [], chats: [Chat] = []) {
        self.connections = connections
        self.chats = chats
        relay.onEvent = { [weak self] payload in
            self?.handleRelayPayload(payload)
        }
        relay.onPaired = { [weak self] in
            self?.requestHomeData()
        }

        guard let connection = connections.first else { return }
        activeConnectionID = connection.id
    }

    var activeBranchName: String {
        guard let path = activeRemoteWorkspace?.path else { return "Workspace" }
        let name = URL(fileURLWithPath: path).lastPathComponent
        return name.isEmpty ? "Workspace" : name
    }

    var activeConnection: Connection? {
        connections.first { $0.id == activeConnectionID }
    }

    var activeProjectName: String {
        activeRemoteWorkspace?.name ?? activeConnection?.name ?? "Desktop"
    }

    var connectionStatusLabel: String {
        relay.statusLabel
    }

    var route: AppRoute {
        path.last ?? .home
    }

    var sessionLoadStateKey: String {
        switch sessionLoadState {
        case .idle:
            "idle"
        case .loading:
            "loading"
        case .loaded:
            "loaded"
        case .failed(let message):
            "failed:\(message)"
        }
    }

    func openNewChat() {
        draft = ""
        promptFocused = false
        path = [.newChat]
    }

    func closeNewChat() {
        promptFocused = false
        path = []
        draft = ""
    }

    func openChat(_ chat: Chat) {
        draft = ""
        promptFocused = false
        path = [.chat(chat.id)]
    }

    func closeChat() {
        promptFocused = false
        path = []
        draft = ""
    }

    func closeTop() {
        promptFocused = false
        if path.isEmpty {
            return
        }
        path.removeLast()
        if path.isEmpty {
            draft = ""
        }
    }

    func selectConnection(_ connection: Connection) {
        activeConnectionID = connection.id
        requestHomeData()
    }

    func pair(with payload: String) -> Bool {
        guard let data = payload.data(using: .utf8),
              let pairing = try? JSONDecoder().decode(PairingPayload.self, from: data),
              pairing.type == "start.mobile.relay",
              let url = URL(string: pairing.relayUrl)
        else { return false }

        upsertConnection(with: pairing)

        relay.connect(
            url: url,
            mobileId: DeviceIdentity.mobileId,
            token: pairing.relayToken ?? "",
            pairingCode: pairing.code ?? ""
        )
        return true
    }

    func retryConnection() {
        relay.retry()
    }

    func refreshChats() async {
        requestSessions()
    }

    func chat(for id: String) -> Chat? {
        chats.first { $0.id == id }
    }

    func messages(for chat: Chat) -> [ChatMessage] {
        sessionMessages[chat.id] ?? []
    }

    func requestHomeData() {
        requestSessions()
        requestModels()
    }

    func requestSessions() {
        guard let desktopId = commandDesktopId else { return }

        if chats.isEmpty {
            sessionLoadState = .loading
        }
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(
                action: "sessions.list",
                requestId: UUID().uuidString,
                limit: 40,
                offset: 0
            )
        )
    }

    func refreshMessages(for chat: Chat) {
        let state = messagePageStates[chat.id] ?? MessagePageState()
        guard !state.loading else { return }
        requestMessages(sessionId: chat.id, reset: true)
    }

    func loadOlderMessages(for chat: Chat) {
        let state = messagePageStates[chat.id] ?? MessagePageState()
        guard state.hasMoreOlder && !state.loading && !(sessionMessages[chat.id] ?? []).isEmpty else { return }
        requestMessages(sessionId: chat.id, reset: false)
    }

    func sendDraft(in chat: Chat) {
        sendDraft(sessionId: chat.id, workspacePath: chat.workspacePath)
    }

    func sendNewDraft() {
        sendDraft(sessionId: "", workspacePath: activeRemoteWorkspace?.path)
    }

    func selectModel(_ key: String) {
        guard let desktopId = commandDesktopId else { return }

        selectedModelKey = key
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "model.select", requestId: UUID().uuidString, modelKey: key)
        )
    }

    func selectThinkingLevel(_ level: String) {
        guard let desktopId = commandDesktopId else { return }

        thinkingLevel = level
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "thinking.select", requestId: UUID().uuidString, level: level)
        )
    }

    private var commandDesktopId: String? {
        guard relay.status == .connected else { return nil }
        if !relay.pairedDesktopId.isEmpty { return relay.pairedDesktopId }
        return activeConnection?.desktopId
    }

    private func requestModels() {
        guard let desktopId = commandDesktopId else { return }

        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "models.list", requestId: UUID().uuidString)
        )
    }

    private func requestMessages(sessionId: String, reset: Bool) {
        guard let desktopId = commandDesktopId else { return }

        let current = messagePageStates[sessionId] ?? MessagePageState()
        let offset = reset ? 0 : current.nextOffset
        messagePageStates[sessionId] = MessagePageState(
            loading: true,
            hasMoreOlder: reset ? true : current.hasMoreOlder,
            nextOffset: offset
        )

        let requestId = UUID().uuidString
        messageRequestOffsets[requestId] = offset
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(
                action: "messages.page",
                requestId: requestId,
                limit: 10,
                offset: offset,
                sessionId: sessionId
            )
        )
    }

    private func sendDraft(sessionId: String, workspacePath: String?) {
        guard let desktopId = commandDesktopId else { return }

        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let requestId = UUID().uuidString
        pendingDrafts[requestId] = text
        if sessionId.isEmpty {
            pendingNewChatTitles[requestId] = text
        }
        draft = ""
        promptFocused = false
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(
                action: "message.send",
                requestId: requestId,
                text: text,
                sessionId: sessionId.isEmpty ? nil : sessionId,
                workspacePath: workspacePath
            )
        )
    }

    private func handleRelayPayload(_ payload: RelayPayload) {
        switch payload.action {
        case "sessions.list.result":
            handleSessionsResult(payload)
        case "messages.page.result":
            handleMessagesResult(payload)
        case "message.send.result":
            handleSendResult(payload)
        case "models.list.result", "model.select.result", "thinking.select.result":
            handleModelsResult(payload)
        case "sessions.changed":
            requestSessions()
        default:
            break
        }
    }

    private func handleSessionsResult(_ payload: RelayPayload) {
        guard payload.ok != false else {
            sessionLoadState = .failed(payload.error ?? "Sessions could not be loaded.")
            return
        }

        activeRemoteWorkspace = payload.workspace
        chats = (payload.sessions ?? []).map { session in
            Chat(
                id: session.id,
                title: session.title,
                modified: session.modified,
                workspaceName: session.workspaceName,
                workspacePath: session.workspacePath
            )
        }
        sessionLoadState = .loaded
    }

    private func handleMessagesResult(_ payload: RelayPayload) {
        guard let sessionId = payload.sessionId else { return }
        let offset = messageRequestOffsets[payload.requestId ?? ""] ?? 0
        messageRequestOffsets[payload.requestId ?? ""] = nil

        guard payload.ok != false else {
            messagePageStates[sessionId] = MessagePageState(loading: false, hasMoreOlder: true, nextOffset: offset)
            return
        }

        let messages = (payload.messages ?? []).map { message in
            ChatMessage(
                id: message.id,
                role: message.role == "user" ? .user : .agent,
                text: message.text,
                createdAt: message.createdAt,
                durationMs: message.durationMs,
                streaming: message.streaming == true,
                thinking: message.thinking
            )
        }

        if offset == 0 {
            sessionMessages[sessionId] = messages
        } else {
            let existing = sessionMessages[sessionId] ?? []
            let incomingIds = Set(messages.map(\.id))
            sessionMessages[sessionId] = messages + existing.filter { !incomingIds.contains($0.id) }
        }

        messagePageStates[sessionId] = MessagePageState(
            loading: false,
            hasMoreOlder: payload.hasMoreOlder ?? false,
            nextOffset: payload.nextOffset ?? messages.count
        )
    }

    private func handleSendResult(_ payload: RelayPayload) {
        let requestId = payload.requestId ?? ""
        let pendingDraft = pendingDrafts[requestId]
        pendingDrafts[requestId] = nil

        guard payload.ok != false else {
            if draft.isEmpty, let pendingDraft {
                draft = pendingDraft
            }
            pendingNewChatTitles[requestId] = nil
            return
        }

        requestSessions()
        guard let sessionId = payload.sessionId else {
            pendingNewChatTitles[requestId] = nil
            return
        }

        if chat(for: sessionId) == nil {
            let workspace = activeRemoteWorkspace
            chats.insert(
                Chat(
                    id: sessionId,
                    title: pendingNewChatTitles[requestId] ?? "New chat",
                    modified: Int(Date().timeIntervalSince1970 * 1000),
                    workspaceName: workspace?.name ?? activeProjectName,
                    workspacePath: workspace?.path ?? ""
                ),
                at: 0
            )
        }
        pendingNewChatTitles[requestId] = nil
        requestMessages(sessionId: sessionId, reset: true)

        if case .newChat = route {
            path = [.chat(sessionId)]
        }
    }

    private func handleModelsResult(_ payload: RelayPayload) {
        guard payload.ok != false else {
            if payload.action != "models.list.result" {
                requestModels()
            }
            return
        }

        if let models = payload.models {
            self.models = models
        }
        if let selectedModelKey = payload.selectedModelKey {
            self.selectedModelKey = selectedModelKey
        }
        if let thinkingLevel = payload.thinkingLevel {
            self.thinkingLevel = thinkingLevel
        }
    }

    private func upsertConnection(with pairing: PairingPayload) {
        if let index = connections.firstIndex(where: { $0.desktopId == pairing.desktopId }) {
            connections[index].name = Connection(pairing: pairing).name
            connections[index].enabled = true
            activeConnectionID = connections[index].id
            return
        }

        let connection = Connection(pairing: pairing)
        connections.insert(connection, at: 0)
        activeConnectionID = connection.id
    }
}
