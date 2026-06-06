import Foundation
import Observation

@Observable
@MainActor
final class RelayClient {
    private let encoder = JSONEncoder()
    private var receiveTask: Task<Void, Never>?
    private var socketTask: URLSessionWebSocketTask?

    var connected = false
    var lastError = ""

    func connect(url: URL, mobileId: String, token: String = "") {
        disconnect()

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
                _ = try await socketTask.receive()
                connected = true
            }
        } catch is CancellationError {
            connected = false
        } catch {
            connected = false
            lastError = error.localizedDescription
        }
    }

    private func send(_ message: some Encodable) {
        Task { [weak self] in
            guard let self, let socketTask else { return }

            do {
                let data = try encoder.encode(message)
                let text = String(decoding: data, as: UTF8.self)
                try await socketTask.send(.string(text))
                connected = true
            } catch {
                connected = false
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
