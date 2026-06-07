import SwiftUI

struct ConnectionScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState

    var body: some View {
        QRCodeScannerView { payload in
            if appState.pair(with: payload) {
                dismiss()
            }
        }
        .overlay(alignment: .center) {
            ScannerReticle()
        }
        .overlay(alignment: .bottom) {
            ScannerInstruction()
                .padding(.bottom, 18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 52, style: .continuous))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 14)
        .padding(.vertical, 18)
        .ignoresSafeArea(.container, edges: .bottom)
        .presentationDetents([.fraction(0.78)])
        .connectionSheetChrome()
    }
}

private struct ScannerReticle: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 26, style: .continuous)
            .stroke(.white.opacity(0.82), lineWidth: 2)
            .frame(width: 220, height: 220)
            .shadow(color: .black.opacity(0.24), radius: 18)
            .padding(18)
            .allowsHitTesting(false)
    }
}

private struct ScannerInstruction: View {
    var body: some View {
        Text("Scan the QR code on your desktop")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .allowsHitTesting(false)
    }
}
