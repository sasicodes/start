import Foundation
import Observation

@Observable
@MainActor
final class AppState {
    var activeConnectionID: UUID?
    var activeWorkspace = Workspace.start
    var connections: [Connection]
    var draft = ""
    var searchText = ""
    var promptFocused = false
    var chatsLoaded = false
    var path: [AppRoute] = []
    var relay = RelayClient()

    let chats: [Chat]

    init(connections: [Connection] = [], chats: [Chat] = []) {
        self.connections = connections
        self.chats = chats

        guard let connection = connections.first else { return }
        activeConnectionID = connection.id
        activeWorkspace = connection.workspace
    }

    var activeBranchName: String {
        activeWorkspace.branchName
    }

    var activeConnection: Connection? {
        connections.first { $0.id == activeConnectionID }
    }

    var activeProjectName: String {
        activeWorkspace.rawValue
    }

    var activeWorkspaceLabel: String {
        "\(activeProjectName) / \(activeBranchName)"
    }

    var connectionStatusLabel: String {
        relay.statusLabel
    }

    var route: AppRoute {
        path.last ?? .home
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
        activeWorkspace = connection.workspace
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
        chatsLoaded = false
        try? await Task.sleep(for: .milliseconds(420))
        guard !Task.isCancelled else { return }
        chatsLoaded = true
    }

    func chat(for id: UUID) -> Chat? {
        chats.first { $0.id == id }
    }

    private func upsertConnection(with pairing: PairingPayload) {
        if let index = connections.firstIndex(where: { $0.desktopId == pairing.desktopId }) {
            connections[index].name = Connection(pairing: pairing).name
            connections[index].enabled = true
            activeConnectionID = connections[index].id
            activeWorkspace = connections[index].workspace
            return
        }

        let connection = Connection(pairing: pairing)
        connections.insert(connection, at: 0)
        activeConnectionID = connection.id
        activeWorkspace = connection.workspace
    }
}
