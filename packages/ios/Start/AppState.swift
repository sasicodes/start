import Foundation
import Observation

@Observable
@MainActor
final class AppState {
    var activeConnectionID = Connection.samples[0].id
    var activeWorkspace = Workspace.start
    var connections = Connection.samples
    var draft = ""
    var composerFocused = false
    var sessionsLoaded = false
    var path: [AppRoute] = []
    var relay = RelayClient()

    let sessions = ChatSession.samples

    var activeProjectName: String {
        sessions.first { $0.workspace == activeWorkspace }?.projectName ?? "start"
    }

    var route: AppRoute {
        path.last ?? .home
    }

    func openComposer() {
        draft = ""
        composerFocused = false
        path = [.composer]
    }

    func closeComposer() {
        composerFocused = false
        path = []
        draft = ""
    }

    func openSession(_ session: ChatSession) {
        draft = ""
        composerFocused = false
        path = [.session(session.id)]
    }

    func closeSession() {
        composerFocused = false
        path = []
        draft = ""
    }

    func closeTop() {
        composerFocused = false
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

    func session(for id: UUID) -> ChatSession? {
        sessions.first { $0.id == id }
    }
}
