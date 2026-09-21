import SwiftUI

@main
struct MarketsApp: App {
    @StateObject private var store = WatchlistStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
                .tint(MarketsTheme.accent)
        }
    }
}
