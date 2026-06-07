import CryptoKit
import Foundation

enum MobileTrust {
    static func key() -> String {
        randomBase64()
    }

    static func nonce() -> String {
        randomBase64()
    }

    static func proof(
        key: String,
        nonce: String,
        mobileId: String,
        desktopId: String
    ) -> String? {
        guard !key.isEmpty,
              let keyData = Data(base64Encoded: key)
        else { return nil }

        let payload = "\(desktopId)\n\(mobileId)\n\(nonce)"
        let code = HMAC<SHA256>.authenticationCode(
            for: Data(payload.utf8),
            using: SymmetricKey(data: keyData)
        )
        return Data(code).base64EncodedString()
    }

    private static func randomBase64() -> String {
        let key = SymmetricKey(size: .bits256)
        return key.withUnsafeBytes { data in
            Data(data).base64EncodedString()
        }
    }
}
