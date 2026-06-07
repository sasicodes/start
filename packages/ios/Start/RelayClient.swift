import Foundation
import Observation

enum RelayConnectionStatus: String {
    case connected = "Connected"
    case connecting = "Connecting"
    case offline = "Offline"
    case reconnecting = "Reconnecting"

    var isAttempting: Bool {
        self == .connecting || self == .reconnecting
    }
}

@Observable
@MainActor
final class RelayClient {
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var lastRequest: RelayConnectionRequest?
    private var pendingPairingCode = ""
    private var receiveTask: Task<Void, Never>?
    private var socketTask: URLSessionWebSocketTask?

    var lastError = ""
    var connected = false
    var pairedDesktopId = ""
    var lastEvent: RelayPayload?
    var status = RelayConnectionStatus.offline
    @ObservationIgnored var onEvent: ((RelayPayload) -> Void)?
    @ObservationIgnored var onStatusChange: ((RelayConnectionStatus) -> Void)?

    var statusLabel: String {
        status.rawValue
    }

    func connect(
        url: URL,
        token: String = "",
        mobileId: String,
        desktopId: String = "",
        pairingCode: String = ""
    ) {
        let request = RelayConnectionRequest(
            url: url,
            token: token,
            mobileId: mobileId,
            desktopId: desktopId,
            pairingCode: pairingCode
        )
        lastRequest = request
        connect(with: request)
    }

    private func connect(with request: RelayConnectionRequest) {
        let shouldReconnect = socketTask != nil || connected
        closeSocket()
        updateStatus(shouldReconnect ? .reconnecting : .connecting)
        pendingPairingCode = request.pairingCode
        pairedDesktopId = ""

        let socketTask = URLSession.shared.webSocketTask(with: request.url)
        self.socketTask = socketTask
        lastError = ""
        socketTask.resume()

        receiveTask = Task { [weak self, socketTask] in
            await self?.receiveMessages(from: socketTask)
        }

        send(HelloMobile(mobileId: request.mobileId, token: request.token.isEmpty ? nil : request.token))
    }

    func disconnect() {
        closeSocket()
        pairedDesktopId = ""
        pendingPairingCode = ""
        updateStatus(.offline)
    }

    func joinPairing(code: String, name: String = "iPhone") {
        send(MobileMessage.pairingJoin(PairingJoin(code: code, name: name)))
    }

    func sendCommand(desktopId: String, payload: RelayPayload) {
        send(MobileMessage.command(MobileCommand(desktopId: desktopId, payload: payload)))
    }

    private func receiveMessages(from socketTask: URLSessionWebSocketTask) async {
        do {
            while !Task.isCancelled {
                let message = try await socketTask.receive()
                guard self.socketTask === socketTask else { return }

                if let decoded = decode(message) {
                    handle(decoded)
                }
            }
        } catch is CancellationError {
            markDisconnected(from: socketTask)
        } catch {
            markDisconnected(from: socketTask, error: error)
        }
    }

    private func decode(_ message: URLSessionWebSocketTask.Message) -> ServerMessage? {
        switch message {
        case .string(let text):
            return try? decoder.decode(ServerMessage.self, from: Data(text.utf8))
        case .data(let data):
            return try? decoder.decode(ServerMessage.self, from: data)
        @unknown default:
            return nil
        }
    }

    private func handle(_ message: ServerMessage) {
        switch message {
        case .ready:
            connected = true
            if !pendingPairingCode.isEmpty {
                updateStatus(.connecting)
                joinPairing(code: pendingPairingCode)
                pendingPairingCode = ""
            } else {
                pairedDesktopId = lastRequest?.desktopId ?? pairedDesktopId
                updateStatus(.connecting)
            }
        case .error(let text):
            connected = false
            lastError = text
            pairedDesktopId = ""
            updateStatus(.offline)
        case .pairingApproved(let desktopId):
            pairedDesktopId = desktopId
            updateStatus(.connected)
        case .desktopEvent(let desktopId, let payload):
            pairedDesktopId = desktopId
            if status != .connected {
                updateStatus(.connected)
            }
            lastEvent = payload
            onEvent?(payload)
        }
    }

    private func send(_ message: some Encodable) {
        Task { [weak self] in
            guard let self, let socketTask else { return }

            do {
                let data = try encoder.encode(message)
                let text = String(decoding: data, as: UTF8.self)
                try await socketTask.send(.string(text))
            } catch {
                markDisconnected(from: socketTask, error: error)
            }
        }
    }

    private func markDisconnected(from socketTask: URLSessionWebSocketTask, error: Error? = nil) {
        guard self.socketTask === socketTask else { return }

        connected = false
        pairedDesktopId = ""
        updateStatus(.offline)
        if let error {
            lastError = error.localizedDescription
        }
    }

    private func closeSocket() {
        receiveTask?.cancel()
        receiveTask = nil
        socketTask?.cancel(with: .goingAway, reason: nil)
        socketTask = nil
        connected = false
    }

    private func updateStatus(_ nextStatus: RelayConnectionStatus) {
        status = nextStatus
        onStatusChange?(nextStatus)
    }
}

private struct RelayConnectionRequest {
    let url: URL
    let token: String
    let mobileId: String
    let desktopId: String
    let pairingCode: String
}

struct HelloMobile: Encodable {
    let type = "hello.mobile"
    let mobileId: String
    let protocolVersion = 1
    let token: String?
}

enum ServerMessage: Decodable {
    case ready(role: String)
    case error(message: String)
    case pairingApproved(desktopId: String)
    case desktopEvent(desktopId: String, payload: RelayPayload)

    private enum CodingKeys: String, CodingKey {
        case type
        case role
        case message
        case desktopId
        case payload
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "relay.ready":
            self = .ready(role: try container.decodeIfPresent(String.self, forKey: .role) ?? "")
        case "relay.error":
            self = .error(message: try container.decode(String.self, forKey: .message))
        case "pairing.approved":
            self = .pairingApproved(desktopId: try container.decode(String.self, forKey: .desktopId))
        case "desktop.event":
            self = .desktopEvent(
                desktopId: try container.decode(String.self, forKey: .desktopId),
                payload: try container.decode(RelayPayload.self, forKey: .payload)
            )
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown relay message type: \(type)"
            )
        }
    }
}

enum MobileMessage: Encodable {
    case pairingJoin(PairingJoin)
    case command(MobileCommand)

    func encode(to encoder: Encoder) throws {
        switch self {
        case .pairingJoin(let message):
            try message.encode(to: encoder)
        case .command(let message):
            try message.encode(to: encoder)
        }
    }
}

struct PairingJoin: Encodable {
    let type = "pairing.join"
    let code: String
    let name: String
}

struct MobileCommand: Encodable {
    let type = "mobile.command"
    let desktopId: String
    let payload: RelayPayload
}

struct RelayPayload: Codable {
    let action: String
    let requestId: String?
    let ok: Bool?
    let error: String?
    let value: String?
    let text: String?
    let level: String?
    let limit: Int?
    let offset: Int?
    let sessionId: String?
    let modelKey: String?
    let workspace: RemoteWorkspace?
    let workspacePath: String?
    let workspaceName: String?
    let hasMore: Bool?
    let hasMoreOlder: Bool?
    let nextOffset: Int?
    let title: String?
    let thinkingLevel: String?
    let selectedModelKey: String?
    let sessions: [RemoteSession]?
    let messages: [RemoteMessage]?
    let models: [RemoteModel]?

    init(
        action: String,
        requestId: String? = nil,
        ok: Bool? = nil,
        error: String? = nil,
        value: String? = nil,
        text: String? = nil,
        level: String? = nil,
        limit: Int? = nil,
        offset: Int? = nil,
        sessionId: String? = nil,
        modelKey: String? = nil,
        workspace: RemoteWorkspace? = nil,
        workspacePath: String? = nil,
        workspaceName: String? = nil,
        hasMore: Bool? = nil,
        hasMoreOlder: Bool? = nil,
        nextOffset: Int? = nil,
        title: String? = nil,
        thinkingLevel: String? = nil,
        selectedModelKey: String? = nil,
        sessions: [RemoteSession]? = nil,
        messages: [RemoteMessage]? = nil,
        models: [RemoteModel]? = nil
    ) {
        self.ok = ok
        self.text = text
        self.level = level
        self.limit = limit
        self.value = value
        self.error = error
        self.title = title
        self.models = models
        self.offset = offset
        self.action = action
        self.messages = messages
        self.modelKey = modelKey
        self.sessions = sessions
        self.requestId = requestId
        self.sessionId = sessionId
        self.workspace = workspace
        self.hasMore = hasMore
        self.nextOffset = nextOffset
        self.workspacePath = workspacePath
        self.workspaceName = workspaceName
        self.hasMoreOlder = hasMoreOlder
        self.thinkingLevel = thinkingLevel
        self.selectedModelKey = selectedModelKey
    }
}

struct PairingPayload: Decodable {
    let type: String
    let version: Int
    let code: String?
    let relayUrl: String
    let desktopId: String
    let desktopName: String?
    let relayToken: String?
}

enum DeviceIdentity {
    private static let mobileIdKey = "start:mobile-id"

    static var mobileId: String {
        let defaults = UserDefaults.standard
        if let existing = defaults.string(forKey: mobileIdKey) { return existing }
        let generated = UUID().uuidString
        defaults.set(generated, forKey: mobileIdKey)
        return generated
    }
}
