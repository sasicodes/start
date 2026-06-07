import Foundation
import Observation
import Security

private let messagePageLimit = 10
private let sessionPageLimit = 40
private let connectionNameMaxLength = 80
private let sessionTitleMaxLength = 120
private let maxConnectionAttempts = 3
private let reconnectRetryDelay = Duration.milliseconds(900)
private let relayTokenKeychainService = "one.intelligence.start.mobile-relay"
private let trustKeyKeychainService = "one.intelligence.start.mobile-trust"
private let connectionsStorageKey = "start:mobile-connections"
private let activeConnectionStorageKey = "start:active-mobile-connection-id"

private struct PendingArchivedChat {
    let chat: Chat
    let index: Int
}

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

    private var modelsRequestId = ""
    private var sessionRequestId = ""
    private var modelSelectRequestId = ""
    private var sessionRefreshPending = false
    private var thinkingSelectRequestId = ""
    private var messageRequestOffsets: [String: Int] = [:]
    private var messageRequestSessions: [String: String] = [:]
    private var optimisticMessages: [String: ChatMessage] = [:]
    private var optimisticMessageSessions: [String: String] = [:]
    private var pendingArchivedChats: [String: PendingArchivedChat] = [:]
    private var pendingArchiveOrder: [String] = []
    private var pendingDrafts: [String: String] = [:]
    private var pendingDraftOrder: [String] = []
    private var pendingRenamedChats: [String: Chat] = [:]
    private var pendingNewChatTitles: [String: String] = [:]
    private var pendingMessageRefreshSessions = Set<String>()
    @ObservationIgnored private var reconnectTask: Task<Void, Never>?
    @ObservationIgnored private var connectionAttemptCount = 0

    init(connections: [Connection]? = nil, chats: [Chat] = []) {
        let initialConnections = connections ?? Self.loadConnections()

        self.connections = initialConnections
        self.chats = chats
        activeConnectionID = Self.activeConnectionID(in: initialConnections)
        relay.onEvent = { [weak self] payload in
            self?.handleRelayPayload(payload)
        }
        relay.onStatusChange = { [weak self] status in
            self?.handleRelayStatus(status)
        }

        connectActiveConnection(resetAttempts: true)
    }

    var activeConnection: Connection? {
        connections.first { $0.id == activeConnectionID }
    }

    var activeWorkspaceHeader: (name: String, branchName: String)? {
        guard let workspace = activeRemoteWorkspace else { return nil }

        let name = workspace.name.isEmpty ? workspaceLeafName(for: workspace.path) : workspace.name
        let branchName: String
        if let value = workspace.branchName, !value.isEmpty {
            branchName = value
        } else {
            branchName = "No branch"
        }
        return (name, branchName)
    }

    var remoteCommandsAvailable: Bool {
        commandDesktopId != nil
    }

    var connectionStatusLabel: String {
        if activeConnection?.enabled == false {
            "Disabled"
        } else if connectionAttempting {
            "Connecting"
        } else {
            switch relay.status {
            case .connected:
                "Connected"
            case .offline:
                "Not connected"
            case .connecting, .reconnecting:
                "Connecting"
            }
        }
    }

    var connectionAttempting: Bool {
        relay.status.isAttempting || reconnectTask != nil
    }

    var connectionRetryAvailable: Bool {
        relay.status == .offline && activeConnection != nil && reconnectTask == nil
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
        if activeConnectionID == connection.id, connectionState(for: connection) == .online {
            requestHomeData()
            return
        }

        activeConnectionID = connection.id
        setConnection(connection, enabled: true)
        persistActiveConnectionID()
        resetRemoteData()
        resetRemoteRequestState()
        connectActiveConnection(resetAttempts: true)
    }

    func deleteConnection(_ connection: Connection) {
        let wasActive = activeConnectionID == connection.id
        connections.removeAll { $0.id == connection.id }
        Self.deleteRelayToken(for: connection.id)
        Self.deleteTrustKey(for: connection.id)

        if wasActive {
            relay.disconnect()
            activeConnectionID = connections.first?.id
            resetRemoteData()
            resetRemoteRequestState()
        }

        persistConnections()
        persistActiveConnectionID()

        if wasActive {
            connectActiveConnection(resetAttempts: true)
        }
    }

    func renameConnection(_ connection: Connection, name: String) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let boundedName = String(trimmedName.prefix(connectionNameMaxLength)).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !boundedName.isEmpty && boundedName != connection.name else { return }
        guard let index = connections.firstIndex(where: { $0.id == connection.id }) else { return }

        connections[index].name = boundedName
        persistConnections()
    }

    func setConnectionEnabled(_ connection: Connection, enabled: Bool) {
        setConnection(connection, enabled: enabled)
        guard activeConnectionID == connection.id else { return }

        if enabled {
            resetRemoteRequestState()
            connectActiveConnection(resetAttempts: true)
            return
        }

        reconnectTask?.cancel()
        reconnectTask = nil
        connectionAttemptCount = 0
        relay.disconnect()
        resetRemoteData()
        resetRemoteRequestState()
    }

    func connectionState(for connection: Connection) -> ConnectionState {
        guard activeConnectionID == connection.id,
              relay.status == .connected,
              relay.pairedDesktopId == connection.desktopId
        else { return .offline }

        return .online
    }

    func pair(with payload: String) -> Bool {
        guard let data = payload.data(using: .utf8),
              let pairing = try? JSONDecoder().decode(PairingPayload.self, from: data),
              pairing.type == "start.mobile.relay",
              URL(string: pairing.relayUrl) != nil
        else { return false }

        upsertConnection(with: pairing)
        resetRemoteData()
        resetRemoteRequestState()
        connectActiveConnection(resetAttempts: true, pairingCode: pairing.code ?? "")
        return true
    }

    func retryConnection() {
        if let activeConnection {
            setConnection(activeConnection, enabled: true)
        }
        resetRemoteRequestState(restoringPendingChanges: true)
        connectActiveConnection(resetAttempts: true)
    }

    func connectActiveConnectionIfNeeded() {
        guard let activeConnection else { return }
        guard activeConnection.enabled else { return }
        guard connectionState(for: activeConnection) == .offline else {
            requestHomeData()
            return
        }
        guard !relay.status.isAttempting else { return }

        resetRemoteRequestState()
        connectActiveConnection(resetAttempts: true)
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
        requestHomeData(requiresVerifiedDesktop: true)
    }

    func requestSessions() {
        requestSessions(requiresVerifiedDesktop: true)
    }

    private func requestHomeData(requiresVerifiedDesktop: Bool) {
        requestSessions(requiresVerifiedDesktop: requiresVerifiedDesktop)
        requestModels(requiresVerifiedDesktop: requiresVerifiedDesktop)
    }

    private func requestSessions(requiresVerifiedDesktop: Bool) {
        guard let desktopId = desktopId(requiresVerified: requiresVerifiedDesktop) else { return }
        guard sessionRequestId.isEmpty else {
            sessionRefreshPending = true
            return
        }

        let requestId = UUID().uuidString
        sessionRequestId = requestId
        if chats.isEmpty {
            sessionLoadState = .loading
        }
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(
                action: "sessions.list",
                requestId: requestId,
                limit: sessionPageLimit,
                offset: 0
            )
        )
    }

    func refreshMessages(for chat: Chat) {
        requestLatestMessages(sessionId: chat.id)
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

    func archive(_ chat: Chat) {
        guard let desktopId = commandDesktopId else { return }
        guard let index = chats.firstIndex(where: { $0.id == chat.id }) else { return }

        let requestId = UUID().uuidString
        pendingArchivedChats[requestId] = PendingArchivedChat(chat: chat, index: index)
        pendingArchiveOrder.append(requestId)
        chats.remove(at: index)
        sessionMessages[chat.id] = nil
        messagePageStates[chat.id] = nil
        pendingMessageRefreshSessions.remove(chat.id)
        closeChat()
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "session.archive", requestId: requestId, sessionId: chat.id)
        )
    }

    func rename(_ chat: Chat, title: String) {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let boundedTitle = String(trimmedTitle.prefix(sessionTitleMaxLength)).trimmingCharacters(in: .whitespacesAndNewlines)
        guard let desktopId = commandDesktopId else { return }
        guard !boundedTitle.isEmpty && boundedTitle != chat.title else { return }

        let requestId = UUID().uuidString
        pendingRenamedChats[requestId] = chat
        replaceChat(chat, title: boundedTitle)
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(
                action: "session.rename",
                requestId: requestId,
                sessionId: chat.id,
                title: boundedTitle
            )
        )
    }

    func selectModel(_ key: String) {
        selectedModelKey = key
        guard let desktopId = commandDesktopId else { return }

        let requestId = UUID().uuidString
        modelSelectRequestId = requestId
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "model.select", requestId: requestId, modelKey: key)
        )
    }

    func selectThinkingLevel(_ level: String) {
        thinkingLevel = level
        guard let desktopId = commandDesktopId else { return }

        let requestId = UUID().uuidString
        thinkingSelectRequestId = requestId
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "thinking.select", requestId: requestId, level: level)
        )
    }

    private var commandDesktopId: String? {
        desktopId(requiresVerified: true)
    }

    private func desktopId(requiresVerified: Bool) -> String? {
        guard relay.connected else { return nil }
        if requiresVerified {
            guard relay.status == .connected else { return nil }
        }
        guard !relay.pairedDesktopId.isEmpty else { return nil }
        guard activeConnection?.desktopId == relay.pairedDesktopId else { return nil }
        return relay.pairedDesktopId
    }

    private static func activeConnectionID(in connections: [Connection]) -> UUID? {
        guard let storedId = UserDefaults.standard.string(forKey: activeConnectionStorageKey),
              let id = UUID(uuidString: storedId),
              connections.contains(where: { $0.id == id })
        else { return connections.first?.id }

        return id
    }

    private static func loadConnections() -> [Connection] {
        guard let data = UserDefaults.standard.data(forKey: connectionsStorageKey),
              let connections = try? JSONDecoder().decode([Connection].self, from: data)
        else { return [] }

        return connections.map { connection in
            Connection(
                id: connection.id,
                name: connection.name,
                enabled: connection.enabled,
                relayUrl: connection.relayUrl,
                desktopId: connection.desktopId,
                relayToken: loadRelayToken(for: connection.id),
                trustKey: loadTrustKey(for: connection.id)
            )
        }
    }

    private static func loadRelayToken(for id: UUID) -> String {
        loadSecret(service: relayTokenKeychainService, for: id)
    }

    private static func loadTrustKey(for id: UUID) -> String {
        loadSecret(service: trustKeyKeychainService, for: id)
    }

    private static func loadSecret(service: String, for id: UUID) -> String {
        var item: CFTypeRef?
        let status = SecItemCopyMatching(
            secretQuery(service: service, for: id, returningData: true) as CFDictionary,
            &item
        )
        guard status == errSecSuccess,
              let data = item as? Data,
              let token = String(data: data, encoding: .utf8)
        else { return "" }

        return token
    }

    private static func deleteRelayToken(for id: UUID) {
        deleteSecret(service: relayTokenKeychainService, for: id)
    }

    private static func deleteTrustKey(for id: UUID) {
        deleteSecret(service: trustKeyKeychainService, for: id)
    }

    private static func deleteSecret(service: String, for id: UUID) {
        _ = SecItemDelete(secretQuery(service: service, for: id) as CFDictionary)
    }

    private static func secretQuery(service: String, for id: UUID, returningData: Bool = false) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: id.uuidString
        ]

        if returningData {
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
        }

        return query
    }

    private func connectActiveConnection(resetAttempts: Bool, pairingCode: String = "") {
        guard let connection = activeConnection,
              connection.enabled,
              let url = URL(string: connection.relayUrl)
        else { return }

        if resetAttempts {
            connectionAttemptCount = 0
            reconnectTask?.cancel()
            reconnectTask = nil
        }

        guard connectionAttemptCount < maxConnectionAttempts else { return }

        connectionAttemptCount += 1
        relay.connect(
            url: url,
            token: connection.relayToken,
            mobileId: DeviceIdentity.mobileId,
            trustKey: connection.trustKey,
            desktopId: connection.desktopId,
            pairingCode: pairingCode
        )
    }

    private func handleRelayStatus(_ status: RelayConnectionStatus) {
        switch status {
        case .connected:
            connectionAttemptCount = 0
            reconnectTask?.cancel()
            reconnectTask = nil
            if sessionRequestId.isEmpty && modelsRequestId.isEmpty {
                requestHomeData()
            }
        case .offline:
            resetRemoteRequestState(restoringPendingChanges: true)
            scheduleReconnect()
        case .connecting, .reconnecting:
            requestHomeData(requiresVerifiedDesktop: false)
        }
    }

    private func persistActiveConnectionID() {
        guard let activeConnectionID else {
            UserDefaults.standard.removeObject(forKey: activeConnectionStorageKey)
            return
        }

        UserDefaults.standard.set(activeConnectionID.uuidString, forKey: activeConnectionStorageKey)
    }

    private func persistConnections() {
        guard !connections.isEmpty else {
            UserDefaults.standard.removeObject(forKey: connectionsStorageKey)
            return
        }

        for connection in connections {
            saveRelayToken(connection.relayToken, for: connection.id)
            saveTrustKey(connection.trustKey, for: connection.id)
        }

        guard let data = try? JSONEncoder().encode(connections) else { return }
        UserDefaults.standard.set(data, forKey: connectionsStorageKey)
    }

    private func saveRelayToken(_ token: String, for id: UUID) {
        saveSecret(token, service: relayTokenKeychainService, for: id)
    }

    private func saveTrustKey(_ key: String, for id: UUID) {
        saveSecret(key, service: trustKeyKeychainService, for: id)
    }

    private func saveSecret(_ value: String, service: String, for id: UUID) {
        let query = Self.secretQuery(service: service, for: id)

        guard !value.isEmpty else {
            _ = SecItemDelete(query as CFDictionary)
            return
        }

        let data = Data(value.utf8)
        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        guard status == errSecItemNotFound else { return }

        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        _ = SecItemAdd(item as CFDictionary, nil)
    }

    private func scheduleReconnect() {
        guard activeConnection?.enabled == true,
              connectionAttemptCount < maxConnectionAttempts,
              reconnectTask == nil
        else { return }

        reconnectTask = Task { [weak self] in
            try? await Task.sleep(for: reconnectRetryDelay)
            guard let self, !Task.isCancelled, self.relay.status == .offline else { return }
            self.reconnectTask = nil
            self.connectActiveConnection(resetAttempts: false)
        }
    }

    private func requestModels(requiresVerifiedDesktop: Bool = true) {
        guard let desktopId = desktopId(requiresVerified: requiresVerifiedDesktop) else { return }
        guard modelsRequestId.isEmpty else { return }

        let requestId = UUID().uuidString
        modelsRequestId = requestId
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(action: "models.list", requestId: requestId)
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
        messageRequestSessions[requestId] = sessionId
        relay.sendCommand(
            desktopId: desktopId,
            payload: RelayPayload(
                action: "messages.page",
                requestId: requestId,
                limit: messagePageLimit,
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
        pendingDraftOrder.append(requestId)
        if sessionId.isEmpty {
            pendingNewChatTitles[requestId] = text
        } else {
            appendOptimisticMessage(
                requestId: requestId,
                sessionId: sessionId,
                text: text,
                createdAt: Int(Date().timeIntervalSince1970 * 1000)
            )
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
        case "session.archive.result":
            handleArchiveResult(payload)
        case "session.rename.result":
            handleRenameResult(payload)
        case "models.list.result", "model.select.result", "thinking.select.result":
            handleModelsResult(payload)
        case "sessions.changed":
            handleSessionsChanged(payload)
        default:
            break
        }
    }

    private func handleSessionsChanged(_ payload: RelayPayload) {
        requestSessions()

        guard case .chat(let id) = route,
              let chat = chat(for: id)
        else { return }
        if let sessionId = payload.sessionId, sessionId != id { return }
        if let workspacePath = payload.workspacePath,
           !workspacePath.isEmpty,
           workspacePath != chat.workspacePath
        {
            return
        }

        requestLatestMessages(sessionId: id)
    }

    private func handleSessionsResult(_ payload: RelayPayload) {
        guard let requestId = payload.requestId, requestId == sessionRequestId else { return }
        defer { finishSessionRequest() }

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
                status: ChatSessionStatus(rawValue: session.status ?? ""),
                noticeKind: SessionNoticeKind(rawValue: session.noticeKind ?? ""),
                workspaceName: session.workspaceName,
                workspacePath: session.workspacePath
            )
        }
        sessionLoadState = .loaded
    }

    private func handleMessagesResult(_ payload: RelayPayload) {
        guard let requestId = payload.requestId,
              let offset = messageRequestOffsets[requestId],
              let sessionId = messageRequestSessions[requestId]
        else { return }

        messageRequestOffsets[requestId] = nil
        messageRequestSessions[requestId] = nil

        guard payload.ok != false else {
            let state = messagePageStates[sessionId] ?? MessagePageState()
            messagePageStates[sessionId] = MessagePageState(
                loading: false,
                hasMoreOlder: state.hasMoreOlder,
                nextOffset: offset
            )
            requestPendingLatestMessages(sessionId: sessionId)
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
            resolveOptimisticMessages(sessionId: sessionId, messages: messages)
            sessionMessages[sessionId] = messagesWithOptimisticMessages(messages, sessionId: sessionId)
        } else {
            let existing = sessionMessages[sessionId] ?? []
            let incomingIds = Set(messages.map(\.id))
            sessionMessages[sessionId] = messages + existing.filter { !incomingIds.contains($0.id) }
        }

        messagePageStates[sessionId] = MessagePageState(
            loading: false,
            hasMoreOlder: payload.hasMoreOlder ?? false,
            nextOffset: payload.nextOffset ?? offset + messages.count
        )
        requestPendingLatestMessages(sessionId: sessionId)
    }

    private func handleSendResult(_ payload: RelayPayload) {
        guard let requestId = payload.requestId else { return }

        let pendingDraft = pendingDrafts[requestId]
        pendingDrafts[requestId] = nil
        pendingDraftOrder.removeAll { $0 == requestId }

        guard payload.ok != false else {
            removeOptimisticMessage(for: requestId)
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
                    workspaceName: workspace?.name ?? "Workspace",
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

    private func handleArchiveResult(_ payload: RelayPayload) {
        guard let requestId = payload.requestId,
              let pending = pendingArchivedChats.removeValue(forKey: requestId)
        else { return }
        pendingArchiveOrder.removeAll { $0 == requestId }

        guard payload.ok != false else {
            restoreArchivedChat(pending)
            return
        }

        requestSessions()
    }

    private func handleRenameResult(_ payload: RelayPayload) {
        guard let requestId = payload.requestId,
              let chat = pendingRenamedChats.removeValue(forKey: requestId)
        else { return }

        guard payload.ok != false else {
            restoreChat(chat)
            return
        }

        requestSessions()
    }

    private func replaceChat(_ chat: Chat, title: String) {
        guard let index = chats.firstIndex(where: { $0.id == chat.id }) else { return }

        chats[index] = Chat(
            id: chat.id,
            title: title,
            modified: chat.modified,
            status: chat.status,
            noticeKind: chat.noticeKind,
            workspaceName: chat.workspaceName,
            workspacePath: chat.workspacePath
        )
    }

    private func restoreChat(_ chat: Chat) {
        if let index = chats.firstIndex(where: { $0.id == chat.id }) {
            chats[index] = chat
            return
        }

        chats.insert(chat, at: 0)
    }

    private func restoreArchivedChat(_ pending: PendingArchivedChat) {
        if let index = chats.firstIndex(where: { $0.id == pending.chat.id }) {
            chats[index] = pending.chat
            return
        }

        chats.insert(pending.chat, at: min(pending.index, chats.count))
    }

    private func appendOptimisticMessage(
        requestId: String,
        sessionId: String,
        text: String,
        createdAt: Int
    ) {
        let message = ChatMessage(
            id: "pending:\(requestId)",
            role: .user,
            text: text,
            createdAt: createdAt
        )
        optimisticMessages[requestId] = message
        optimisticMessageSessions[requestId] = sessionId
        sessionMessages[sessionId] = (sessionMessages[sessionId] ?? []) + [message]
    }

    private func messagesWithOptimisticMessages(_ messages: [ChatMessage], sessionId: String) -> [ChatMessage] {
        let messageIds = Set(messages.map(\.id))
        let optimistic = optimisticMessageSessions.compactMap { requestId, optimisticSessionId -> ChatMessage? in
            guard optimisticSessionId == sessionId,
                  let message = optimisticMessages[requestId],
                  !messageIds.contains(message.id)
            else { return nil }
            return message
        }
        return messages + optimistic.sorted { $0.createdAt < $1.createdAt }
    }

    private func removeOptimisticMessage(for requestId: String) {
        guard let sessionId = optimisticMessageSessions[requestId],
              let optimisticMessage = optimisticMessages[requestId]
        else {
            optimisticMessages[requestId] = nil
            optimisticMessageSessions[requestId] = nil
            return
        }

        optimisticMessages[requestId] = nil
        optimisticMessageSessions[requestId] = nil
        guard var messages = sessionMessages[sessionId] else { return }
        messages.removeAll { $0.id == optimisticMessage.id }
        sessionMessages[sessionId] = messages
    }

    private func resolveOptimisticMessages(sessionId: String, messages: [ChatMessage]) {
        var userTextCounts: [String: Int] = [:]
        for message in messages where message.role == .user {
            userTextCounts[message.text, default: 0] += 1
        }

        for (requestId, optimisticSessionId) in Array(optimisticMessageSessions) where optimisticSessionId == sessionId {
            guard let optimisticMessage = optimisticMessages[requestId] else { continue }
            let count = userTextCounts[optimisticMessage.text] ?? 0
            guard count > 0 else { continue }

            userTextCounts[optimisticMessage.text] = count - 1
            optimisticMessages[requestId] = nil
            optimisticMessageSessions[requestId] = nil
        }
    }

    private func handleModelsResult(_ payload: RelayPayload) {
        switch payload.action {
        case "models.list.result":
            guard let requestId = payload.requestId, requestId == modelsRequestId else { return }
            modelsRequestId = ""
        case "model.select.result":
            guard let requestId = payload.requestId, requestId == modelSelectRequestId else { return }
            modelSelectRequestId = ""
        case "thinking.select.result":
            guard let requestId = payload.requestId, requestId == thinkingSelectRequestId else { return }
            thinkingSelectRequestId = ""
        default:
            return
        }

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

    private func finishSessionRequest() {
        sessionRequestId = ""
        guard sessionRefreshPending else { return }

        sessionRefreshPending = false
        requestSessions()
    }

    private func resetRemoteRequestState(restoringPendingChanges: Bool = false) {
        if restoringPendingChanges {
            restorePendingRemoteChanges()
        }

        modelsRequestId = ""
        sessionRequestId = ""
        modelSelectRequestId = ""
        sessionRefreshPending = false
        thinkingSelectRequestId = ""
        pendingMessageRefreshSessions.removeAll()
        messageRequestOffsets.removeAll()
        messageRequestSessions.removeAll()
        optimisticMessages.removeAll()
        optimisticMessageSessions.removeAll()
        pendingArchivedChats.removeAll()
        pendingArchiveOrder.removeAll()
        pendingDrafts.removeAll()
        pendingDraftOrder.removeAll()
        pendingRenamedChats.removeAll()
        pendingNewChatTitles.removeAll()
        for (sessionId, state) in messagePageStates where state.loading {
            messagePageStates[sessionId] = MessagePageState(
                loading: false,
                hasMoreOlder: state.hasMoreOlder,
                nextOffset: state.nextOffset
            )
        }
    }

    private func restorePendingRemoteChanges() {
        for requestId in pendingArchiveOrder.reversed() {
            guard let pending = pendingArchivedChats[requestId] else { continue }
            restoreArchivedChat(pending)
        }

        for chat in pendingRenamedChats.values {
            restoreChat(chat)
        }

        for requestId in pendingDraftOrder {
            removeOptimisticMessage(for: requestId)
        }

        if draft.isEmpty {
            draft = pendingDraftOrder.reversed().compactMap { pendingDrafts[$0] }.first ?? ""
        }
    }

    private func resetRemoteData() {
        draft = ""
        searchText = ""
        models = []
        chats = []
        thinkingLevel = ""
        selectedModelKey = ""
        activeRemoteWorkspace = nil
        sessionLoadState = .idle
        sessionMessages.removeAll()
        messagePageStates.removeAll()
    }

    private func requestLatestMessages(sessionId: String) {
        let state = messagePageStates[sessionId] ?? MessagePageState()
        guard !state.loading else {
            pendingMessageRefreshSessions.insert(sessionId)
            return
        }

        requestMessages(sessionId: sessionId, reset: true)
    }

    private func requestPendingLatestMessages(sessionId: String) {
        guard pendingMessageRefreshSessions.remove(sessionId) != nil else { return }
        requestLatestMessages(sessionId: sessionId)
    }

    private func setConnection(_ connection: Connection, enabled: Bool) {
        guard let index = connections.firstIndex(where: { $0.id == connection.id }) else { return }
        guard connections[index].enabled != enabled else { return }

        connections[index].enabled = enabled
        persistConnections()
    }

    private func upsertConnection(with pairing: PairingPayload) {
        if let index = connections.firstIndex(where: { $0.desktopId == pairing.desktopId }) {
            let trustKey = connections[index].trustKey.isEmpty ? MobileTrust.key() : connections[index].trustKey
            let nextConnection = Connection(pairing: pairing, trustKey: trustKey)

            connections[index] = Connection(
                id: connections[index].id,
                name: nextConnection.name,
                enabled: true,
                relayUrl: nextConnection.relayUrl,
                desktopId: nextConnection.desktopId,
                relayToken: nextConnection.relayToken,
                trustKey: nextConnection.trustKey
            )
            activeConnectionID = connections[index].id
            persistConnections()
            persistActiveConnectionID()
            return
        }

        let nextConnection = Connection(pairing: pairing, trustKey: MobileTrust.key())
        connections.insert(nextConnection, at: 0)
        activeConnectionID = nextConnection.id
        persistConnections()
        persistActiveConnectionID()
    }
}
