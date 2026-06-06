import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState
    @Namespace private var transitionNamespace

    var body: some View {
        @Bindable var appState = appState

        NavigationStack(path: $appState.path) {
            ZStack {
                Color.black.ignoresSafeArea()

                HomeView(transitionNamespace: transitionNamespace)
                    .navigationDestination(for: AppRoute.self) { route in
                        ZStack {
                            Color.black.ignoresSafeArea()

                            switch route {
                            case .home:
                                HomeView(transitionNamespace: transitionNamespace)
                            case .composer:
                                ComposerView()
                                    .navigationTransition(.zoom(sourceID: "composer", in: transitionNamespace))
                            case let .session(id):
                                if let session = appState.session(for: id) {
                                    SessionDetailView(session: session)
                                        .navigationTransition(.zoom(sourceID: session.id, in: transitionNamespace))
                                } else {
                                    HomeView(transitionNamespace: transitionNamespace)
                                }
                            }
                        }
                    }
                    .toolbar(.hidden, for: .navigationBar)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(.white)
        .background(Color.black)
    }
}

#Preview {
    RootView()
        .environment(AppState())
}
