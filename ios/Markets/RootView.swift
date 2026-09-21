import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: WatchlistStore

    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.line.uptrend.xyaxis") }

            WatchlistWorkspaceView()
                .tabItem { Label("Watchlist", systemImage: "list.bullet.rectangle") }
        }
        .tint(MarketsTheme.accent)
        .background(MarketsTheme.bg.ignoresSafeArea())
        .overlay(alignment: .top) {
            if MarketsConfig.finnhubAPIKey.isEmpty {
                Text("Set FINNHUB_API_KEY when building to load live data.")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(Color.yellow)
            }
        }
    }
}
