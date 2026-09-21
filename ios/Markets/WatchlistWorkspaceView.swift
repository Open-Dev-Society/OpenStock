import SwiftUI

struct WatchlistWorkspaceView: View {
    @EnvironmentObject private var store: WatchlistStore
    @State private var showAdd = false
    @State private var showSearch = false
    @State private var showReorder = false
    /// Defer heavy panels until after the first frame — eager VStack + panels was exiting on tab switch.
    @State private var showDetailPanels = false
    /// True while the ScrollView is at rest; post-load content swaps wait for this.
    @State private var scrollSettled = true

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    Text("Select a security for charts and news. Use Reorder to rearrange.")
                        .font(.subheadline)
                        .foregroundStyle(MarketsTheme.muted)
                        .padding(.horizontal, 4)

                    overviewBlock

                    if showDetailPanels, let selected = store.selected {
                        SymbolPanelsView(
                            symbol: selected.item.symbol,
                            company: selected.displayName
                        )
                        .id("panels-\(selected.item.symbol)")
                    }

                    marketNewsBlock
                }
                .padding(16)
                .environment(\.scrollSettled, scrollSettled)
            }
            .reportsScrollPhase(to: $scrollSettled)
            .background(MarketsTheme.bg.ignoresSafeArea())
            .navigationTitle("Watchlist")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Reorder") { showReorder = true }
                        .disabled(store.enriched.count < 2)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button { showSearch = true } label: { Image(systemName: "magnifyingglass") }
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                    Button { store.removeSelected() } label: { Image(systemName: "trash") }
                        .disabled(store.selected == nil)
                    Button {
                        Task { await store.refreshAll() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(store.isRefreshing)
                }
            }
            .sheet(isPresented: $showAdd) { AddStocksSheet() }
            .sheet(isPresented: $showSearch) { SearchSheet(mode: .focus) }
            .sheet(isPresented: $showReorder) { ReorderWatchlistSheet() }
            .refreshable { await store.refreshAll() }
            .task {
                // Give the tab a real frame to paint the overview before mounting
                // chart/fundamentals trees — Task.yield() alone does not yield a frame.
                // Also never mount while the user is already scrolling.
                try? await Task.sleep(nanoseconds: 150_000_000)
                while !scrollSettled {
                    try? await Task.sleep(nanoseconds: 100_000_000)
                }
                showDetailPanels = true
            }
        }
    }

    private var overviewBlock: some View {
        SectionCard(title: "Market Overview", subtitle: "Watchlist mini chart + symbols") {
            if let selected = store.selected {
                SelectedOverviewHeader(row: selected)
                    .id("overview-\(selected.item.symbol)")
            } else {
                Text("Add stocks to get started.")
                    .foregroundStyle(MarketsTheme.muted)
            }

            ForEach(store.enriched) { row in
                Button {
                    store.select(row.item.symbol)
                } label: {
                    WatchlistOverviewRow(row: row, selected: store.selectedSymbol == row.item.symbol)
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button(role: .destructive) {
                        store.remove(row.item.symbol)
                    } label: {
                        Label("Remove", systemImage: "trash")
                    }
                }
            }

            if let symbol = store.selected?.item.symbol {
                Divider().overlay(MarketsTheme.border)
                CompanyNewsInline(symbol: symbol)
                    .id("news-\(symbol)")
            }
        }
    }

    private var marketNewsBlock: some View {
        MarketNewsSection()
    }
}

struct MarketNewsSection: View {
    @EnvironmentObject private var store: WatchlistStore
    @Environment(\.scrollSettled) private var scrollSettled

    var body: some View {
        SectionCard(title: "Market News", subtitle: "Finnhub news across your watchlist") {
            if store.marketNews.isEmpty || !scrollSettled {
                Text(newsPlaceholderText)
                    .foregroundStyle(MarketsTheme.muted)
            } else {
                ForEach(store.marketNews) { article in
                    NewsRow(article: article)
                    Divider().overlay(MarketsTheme.border)
                }
            }
        }
    }

    private var newsPlaceholderText: String {
        if !store.marketNews.isEmpty { return "Loading market news…" }
        return store.isRefreshing ? "Loading market news…" : "No market news yet."
    }
}

struct ReorderWatchlistSheet: View {
    @EnvironmentObject private var store: WatchlistStore
    @Environment(\.dismiss) private var dismiss
    @State private var editMode: EditMode = .active

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.enriched) { row in
                    Text("\(row.item.symbol) — \(row.displayName)")
                        .foregroundStyle(MarketsTheme.text)
                        .listRowBackground(MarketsTheme.card)
                }
                .onMove(perform: store.move)
            }
            .scrollContentBackground(.hidden)
            .background(MarketsTheme.bg.ignoresSafeArea())
            .environment(\.editMode, $editMode)
            .navigationTitle("Reorder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct SelectedOverviewHeader: View {
    let row: EnrichedSymbol
    @State private var candles: [CandlePoint] = []
    @State private var loadChart = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(row.item.symbol)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(MarketsTheme.text)
                Spacer()
                Text(Formatters.money(row.quote?.price))
                    .font(.title3.monospacedDigit().weight(.semibold))
                    .foregroundStyle(MarketsTheme.text)
            }
            Text(row.displayName)
                .font(.subheadline)
                .foregroundStyle(MarketsTheme.muted)
            QuoteChangeText(quote: row.quote)
            if loadChart {
                PriceChartView(points: candles, mode: .baseline)
            } else {
                Color.clear.frame(height: 220)
            }
        }
        .padding(.vertical, 4)
        .task(id: row.item.symbol) {
            await Task.yield()
            loadChart = true
            let raw = (try? await FinnhubClient.shared.candles(symbol: row.item.symbol, days: 120)) ?? []
            candles = CandlePoint.sanitized(raw, limit: 90)
        }
    }
}

struct WatchlistOverviewRow: View {
    let row: EnrichedSymbol
    let selected: Bool

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if let url = row.profile?.logoURL {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit()
                        default:
                            RoundedRectangle(cornerRadius: 6).fill(MarketsTheme.border)
                        }
                    }
                } else {
                    RoundedRectangle(cornerRadius: 6).fill(MarketsTheme.border)
                }
            }
            .frame(width: 28, height: 28)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 2) {
                Text(row.item.symbol)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(MarketsTheme.text)
                Text(row.displayName)
                    .font(.caption)
                    .foregroundStyle(MarketsTheme.muted)
                    .lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(Formatters.money(row.quote?.price))
                    .font(.subheadline.monospacedDigit().weight(.semibold))
                    .foregroundStyle(MarketsTheme.text)
                HStack(spacing: 6) {
                    if let change = row.quote?.change, change.isFinite {
                        Text(String(format: "%+.2f", change))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(row.quote?.isUp == true ? MarketsTheme.up : MarketsTheme.down)
                    }
                    QuoteChangeText(quote: row.quote)
                }
            }
        }
        .padding(.vertical, 4)
        .background(
            selected ? MarketsTheme.accent.opacity(0.08) : Color.clear,
            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
        )
    }
}

struct CompanyNewsInline: View {
    let symbol: String
    @State private var articles: [NewsArticle] = []
    @State private var loaded = false
    @Environment(\.scrollSettled) private var scrollSettled

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Company News")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(MarketsTheme.text)
            if articles.isEmpty || !scrollSettled {
                Text(!loaded ? "Loading company news…" : "No recent company stories.")
                    .font(.footnote)
                    .foregroundStyle(MarketsTheme.muted)
            } else {
                ForEach(articles) { article in
                    NewsRow(article: article, showBadge: false)
                    Divider().overlay(MarketsTheme.border)
                }
            }
        }
        .padding(.vertical, 4)
        .task(id: symbol) {
            loaded = false
            let tick = (try? await TickerTickClient.shared.news(symbol: symbol)) ?? []
            let finn = (try? await FinnhubClient.shared.companyNews(symbol: symbol)) ?? []
            articles = NewsArticle.deduplicated(tick + finn, limit: 8)
            loaded = true
        }
    }
}
