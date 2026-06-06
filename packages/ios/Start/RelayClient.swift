import Foundation
import Observation

enum RelayConnectionStatus: String {
    case connected = "Connected"
    case connecting = "Connecting"
    case offline = "Offline"
    case reconnecting = "Reconnecting"
}

@Observable
@MainActor
final class RelayClient {
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var pendingPairingCode = ""
    private var receiveTask: Task<Void, Never>?
    private var socketTask: URLSessionWebSocketTask?

    var lastError = ""
    var connected = false
    var pairedDesktopId = ""
    var lastEvent: RelayPayload?
    var status = RelayConnectionStatus.offline

    var statusLabel: String {
        status.rawValue
    }

    func connect(url: URL, mobileId: String, token: String = "", pairingCode: String = "") {
        let shouldReconnect = socketTask != nil || connected
        disconnect()
        status = shouldReconnect ? .reconnecting : .connecting
        pendingPairingCode = pairingCode

        let socketTask = URLSession.shared.webSocketTask(with: url)
        self.socketTask = socketTask
        lastError = ""
        socketTask.resume()

        receiveTask = Task { [weak self, socketTask] in
            await self?.receiveMessages(from: socketTask)
        }

        send(HelloMobile(mobileId: mobileId, token: token.isEmpty ? nil : token))
    }

    func disconnect() {
        receiveTask?.cancel()
        receiveTask = nil
        socketTask?.cancel(with: .goingAway, reason: nil)
        socketTask = nil
        connected = false
        status = .offline
        pendingPairingCode = ""
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
                if let decoded = decode(message) {
                    handle(decoded)
                }
            }
        } catch is CancellationError {
            connected = false
            status = .offline
        } catch {
            connected = false
            status = .offline
            lastError = error.localizedDescription
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
            status = .connected
            if !pendingPairingCode.isEmpty {
                joinPairing(code: pendingPairingCode)
                pendingPairingCode = ""
            }
        case .error(let text):
            lastError = text
        case .pairingApproved(let desktopId):
            pairedDesktopId = desktopId
        case .desktopEvent(_, let payload):
            lastEvent = payload
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
                connected = false
                status = .offline
                lastError = error.localizedDescription
            }
        }
    }
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
    let value: String
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
