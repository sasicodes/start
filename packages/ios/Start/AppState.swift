import Foundation
import Observation

@Observable
@MainActor
final class AppState {
    var activeConnectionID = Connection.samples[0].id
    var activeWorkspace = Workspace.start
    var connections = Connection.samples
    var draft = ""
    var searchText = ""
    var promptFocused = false
    var sessionsLoaded = false
    var path: [AppRoute] = []
    var relay = RelayClient()

    let sessions = Session.samples

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

    func openNewSession() {
        draft = ""
        promptFocused = false
        path = [.newSession]
    }

    func closeNewSession() {
        promptFocused = false
        path = []
        draft = ""
    }

    func openSession(_ session: Session) {
        draft = ""
        promptFocused = false
        path = [.session(session.id)]
    }

    func closeSession() {
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

    func pair(with payload: String) {
        guard let data = payload.data(using: .utf8),
              let pairing = try? JSONDecoder().decode(PairingPayload.self, from: data),
              pairing.type == "start.mobile.relay",
              let url = URL(string: pairing.relayUrl)
        else { return }

        relay.connect(url: url, mobileId: DeviceIdentity.mobileId, token: pairing.relayToken ?? "")
    }

    func refreshSessions() async {
        sessionsLoaded = false
        try? await Task.sleep(for: .milliseconds(420))
        guard !Task.isCancelled else { return }
        sessionsLoaded = true
    }

    func session(for id: UUID) -> Session? {
        sessions.first { $0.id == id }
    }
}
