import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState
    @FocusState private var searchFocused: Bool
    @State private var scannerOpen = false
    @State private var expandedWorkspaces = Set(Workspace.allCases)
    @State private var sort = WorkspaceSort.recent
    let transitionNamespace: Namespace.ID

    var body: some View {
        @Bindable var appState = appState
        let searchActive = searchFocused || !appState.searchText.isEmpty

        return ScrollView(showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: 16) {
                titleRow

                contentList
            }
            .padding(.horizontal, StartTheme.Metrics.pagePadding)
            .padding(.bottom, StartTheme.Metrics.homeListBottomPadding)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .overlay {
            VStack {
                Spacer()

                HStack(spacing: searchActive ? 6 : 10) {
                    HomeSearchBar(text: $appState.searchText, focused: $searchFocused)

                    if !searchActive {
                        ChatButton(transitionNamespace: transitionNamespace) {
                            withAnimation(.smooth(duration: 0.18)) {
                                appState.openNewChat()
                            }
                        }
                        .transition(.scale(scale: 0.76).combined(with: .opacity))
                    }
                }
                .animation(.bouncy(duration: 0.28, extraBounce: 0.12), value: searchActive)
                .padding(.leading, searchActive ? 14 : StartTheme.Metrics.floatingButtonHorizontalPadding)
                .padding(.trailing, searchActive ? 14 : StartTheme.Metrics.floatingButtonHorizontalPadding)
                .padding(.bottom, searchActive ? 16 : StartTheme.Metrics.floatingButtonBottomPadding)
            }
            .ignoresSafeArea(.container, edges: .bottom)
        }
        .refreshable {
            await appState.refreshChats()
        }
        .animation(.easeOut(duration: 0.16), value: appState.chatsLoaded)
        .sheet(isPresented: $scannerOpen) {
            ConnectionScannerSheet()
        }
        .task {
            guard !appState.chatsLoaded else { return }
            appState.chatsLoaded = true
        }
    }

    private var visibleChats: [Chat] {
        let query = appState.searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return appState.chats }

        return appState.chats.filter { chat in
            chat.title.localizedCaseInsensitiveContains(query)
                || chat.projectName.localizedCaseInsensitiveContains(query)
                || chat.branchName.localizedCaseInsensitiveContains(query)
        }
    }

    private var contentList: some View {
        Group {
            if appState.chatsLoaded {
                WorkspaceChatList(
                    sections: workspaceChatSections(from: visibleChats, sort: sort),
                    expandedWorkspaces: $expandedWorkspaces,
                    transitionNamespace: transitionNamespace
                )
                .transition(.opacity)
            } else {
                SkeletonList()
                    .transition(.opacity)
            }
        }
        .padding(.top, 4)
    }

    private var titleRow: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 1) {
                Text("Start")
                    .font(StartTheme.Text.title)
                    .foregroundStyle(StartTheme.Colors.ink)

                Text(appState.connectionStatusLabel)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.softInk.opacity(0.48))
                    .contentTransition(.opacity)
                    .animation(.easeInOut(duration: 0.16), value: appState.connectionStatusLabel)
            }
            .frame(height: StartTheme.Metrics.floatingButtonSize, alignment: .center)

            Spacer()

            HomeTopMenu(
                sort: sort,
                activeConnectionID: appState.activeConnectionID,
                connections: appState.connections,
                onAddConnection: {
                    scannerOpen = true
                },
                onSelectSort: { sort = $0 },
                onSelectConnection: appState.selectConnection
            )
        }
        .frame(height: StartTheme.Metrics.floatingButtonSize)
    }
}

private struct HomeSearchBar: View {
    @Binding var text: String
    @FocusState.Binding var focused: Bool

    private var active: Bool {
        focused || !text.isEmpty
    }

    var body: some View {
        HStack(spacing: active ? 6 : 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(StartTheme.Colors.ink.opacity(0.82))

                TextField(
                    "",
                    text: $text,
                    prompt: Text("Search")
                        .foregroundStyle(StartTheme.Colors.ink.opacity(0.62))
                )
                .focused($focused)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(StartTheme.Colors.ink)
                    .tint(StartTheme.Colors.ink)
                    .submitLabel(.search)
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)
                    .accessibilityLabel("Search chats")
                    .onSubmit {
                        focused = false
                    }
            }
            .frame(maxWidth: .infinity, minHeight: StartTheme.Metrics.floatingButtonHitSize)
            .padding(.leading, 16)
            .padding(.trailing, 14)
            .contentShape(Capsule())
            .glassSearchCapsule(active: active)
            .simultaneousGesture(
                TapGesture().onEnded {
                    focused = true
                }
            )

            if active {
                Button {
                    withAnimation(.bouncy(duration: 0.32, extraBounce: 0.22)) {
                        text = ""
                        focused = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(StartTheme.Colors.ink.opacity(0.84))
                        .frame(width: StartTheme.Metrics.floatingButtonHitSize, height: StartTheme.Metrics.floatingButtonHitSize)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .glassSearchCapsule(active: true)
                .accessibilityLabel("Close search")
                .transition(.searchBubbleSplit)
                .zIndex(1)
            }
        }
        .animation(.bouncy(duration: 0.28, extraBounce: 0.12), value: active)
    }
}

private struct SearchBubbleSplitModifier: ViewModifier {
    let active: Bool

    func body(content: Content) -> some View {
        content
            .scaleEffect(active ? 1 : 0.82, anchor: .leading)
            .offset(x: active ? 0 : -18)
            .opacity(active ? 1 : 0)
    }
}

private extension AnyTransition {
    static var searchBubbleSplit: AnyTransition {
        .asymmetric(
            insertion: .modifier(
                active: SearchBubbleSplitModifier(active: false),
                identity: SearchBubbleSplitModifier(active: true)
            ),
            removal: .modifier(
                active: SearchBubbleSplitModifier(active: false),
                identity: SearchBubbleSplitModifier(active: true)
            )
        )
    }
}

private struct ConnectionScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState

    var body: some View {
        QRCodeScannerView { payload in
            appState.pair(with: payload)
            dismiss()
        }
        .overlay {
            ScannerReticle()
        }
        .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 14)
        .padding(.top, 14)
        .padding(.bottom, 8)
        .presentationDetents([.fraction(0.78)])
        .presentationCornerRadius(42)
        .presentationDragIndicator(.visible)
        .presentationBackground(StartTheme.Colors.background)
    }
}

private struct ScannerReticle: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(.white.opacity(0.82), lineWidth: 2)
                .frame(width: 220, height: 220)
                .shadow(color: .black.opacity(0.24), radius: 18)

            VStack {
                Spacer()

                PhaseAnimator([0.58, 1.0]) { opacity in
                    Text("Scan the QR code on your desktop")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(opacity))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())
                } animation: { _ in
                    .easeInOut(duration: 0.9)
                }
                .padding(.bottom, 18)
            }
        }
        .padding(18)
        .allowsHitTesting(false)
    }
}

#Preview {
    @Previewable @Namespace var namespace

    HomeView(transitionNamespace: namespace)
        .environment(AppState())
        .preferredColorScheme(.dark)
}
