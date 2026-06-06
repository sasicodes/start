import SwiftUI
import VisionKit

struct QRCodeScannerView: UIViewControllerRepresentable {
    let onScan: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan)
    }

    func makeUIViewController(context: Context) -> QRCodeScannerViewController {
        let scanner = QRCodeScannerViewController(
            scanner: DataScannerViewController(
                recognizedDataTypes: [.barcode(symbologies: [.qr])],
                qualityLevel: .balanced,
                recognizesMultipleItems: false,
                isHighFrameRateTrackingEnabled: false,
                isPinchToZoomEnabled: true,
                isGuidanceEnabled: true,
                isHighlightingEnabled: true
            )
        )
        scanner.updateDelegate(context.coordinator)
        return scanner
    }

    func updateUIViewController(_ scanner: QRCodeScannerViewController, context: Context) {
        scanner.updateDelegate(context.coordinator)
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        private let onScan: (String) -> Void
        private var scanned = false

        init(onScan: @escaping (String) -> Void) {
            self.onScan = onScan
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            scan(item)
        }

        func dataScanner(
            _ dataScanner: DataScannerViewController,
            didAdd addedItems: [RecognizedItem],
            allItems: [RecognizedItem]
        ) {
            guard let item = addedItems.first else { return }
            scan(item)
        }

        private func scan(_ item: RecognizedItem) {
            guard !scanned else { return }
            guard case let .barcode(barcode) = item else { return }
            guard let payload = barcode.payloadStringValue else { return }
            scanned = true
            onScan(payload)
        }
    }
}

final class QRCodeScannerViewController: UIViewController {
    private let scanner: DataScannerViewController

    init(scanner: DataScannerViewController) {
        self.scanner = scanner
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        nil
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        addChild(scanner)
        view.addSubview(scanner.view)
        scanner.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            scanner.view.topAnchor.constraint(equalTo: view.topAnchor),
            scanner.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scanner.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scanner.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        scanner.didMove(toParent: self)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        try? scanner.startScanning()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        scanner.stopScanning()
    }

    func updateDelegate(_ delegate: DataScannerViewControllerDelegate) {
        scanner.delegate = delegate
    }
}
