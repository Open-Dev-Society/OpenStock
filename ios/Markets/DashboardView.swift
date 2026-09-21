import SwiftUI

struct DashboardView: View {
    @StateObject private var market = MarketDataStore()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    marketOverviewCard
                    heatmapCard
                    marketQuotesCard
                    topStoriesCard
                }
                .padding(16)
            }
            .background(MarketsTheme.bg.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await market.load() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task { await market.load() }
            .refreshable { await market.load() }
        }
    }

    private var marketOverviewCard: some View {
        SectionCard(title: "Market Overview", subtitle: "Sector symbols with 12M-style sparklines") {
            Picker("Sector", selection: $market.sectorIndex) {
                ForEach(Array(MarketCatalog.sectors.enumerated()), id: \.offset) { index, sector in
                    Text(sector.title).tag(index)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: market.sectorIndex) { _ in
                Task { await market.refreshSector() }
            }

            if let selected = market.overviewRows.first(where: { $0.ticker == market.selectedOverviewSymbol }) ?? market.overviewRows.first {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(selected.ticker)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(MarketsTheme.text)
                        Spacer()
                        Text(Formatters.money(selected.quote?.price))
                            .font(.title3.monospacedDigit().weight(.semibold))
                            .foregroundStyle(MarketsTheme.text)
                    }
                    QuoteChangeText(quote: selected.quote)
                    SparklineView(points: selected.sparkline, up: selected.quote?.isUp ?? true)
                        .frame(height: 120)
                }
                .padding(.top, 4)
            }

            ForEach(market.overviewRows) { row in
                Button {
                    market.selectedOverviewSymbol = row.ticker
                } label: {
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.ticker)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(MarketsTheme.text)
                            Text(row.name)
                                .font(.caption)
                                .foregroundStyle(MarketsTheme.muted)
                                .lineLimit(1)
                        }
                        Spacer()
                        SparklineView(points: row.sparkline, up: row.quote?.isUp ?? true)
                            .frame(width: 64, height: 28)
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(Formatters.money(row.quote?.price))
                                .font(.subheadline.monospacedDigit().weight(.semibold))
                                .foregroundStyle(MarketsTheme.text)
                            QuoteChangeText(quote: row.quote)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 10)
                    .background(
                        (market.selectedOverviewSymbol == row.ticker
                         ? MarketsTheme.accent.opacity(0.08)
                         : Color.clear),
                        in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var heatmapCard: some View {
        SectionCard(title: "Stock Heatmap", subtitle: "Native mosaic of large-cap movers (approx of SPX heatmap)") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
                ForEach(market.heatmapRows) { row in
                    let pct = row.quote?.changePercent ?? 0
                    VStack(spacing: 4) {
                        Text(row.ticker)
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                        Text(Formatters.pct(pct))
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.white.opacity(0.9))
                    }
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(
                        (pct >= 0 ? MarketsTheme.up : MarketsTheme.down)
                            .opacity(min(0.25 + abs(pct) / 40.0, 0.95)),
                        in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                    )
                }
            }
            if market.heatmapRows.isEmpty && market.isLoading {
                ProgressView().frame(maxWidth: .infinity, minHeight: 80)
            }
        }
    }

    private var marketQuotesCard: some View {
        SectionCard(title: "Market Quotes", subtitle: "Same sector groups as Market Overview") {
            Picker("Sector", selection: $market.sectorIndex) {
                ForEach(Array(MarketCatalog.sectors.enumerated()), id: \.offset) { index, sector in
                    Text(sector.title).tag(index)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: market.sectorIndex) { _ in
                Task { await market.refreshSector() }
            }

            ForEach(market.quoteRows) { row in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(row.ticker)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(MarketsTheme.text)
                        Text(row.name)
                            .font(.caption)
                            .foregroundStyle(MarketsTheme.muted)
                            .lineLimit(1)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(Formatters.money(row.quote?.price))
                            .font(.subheadline.monospacedDigit().weight(.semibold))
                            .foregroundStyle(MarketsTheme.text)
                        HStack(spacing: 8) {
                            if let change = row.quote?.change {
                                Text(String(format: "%+.2f", change))
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(row.quote?.isUp == true ? MarketsTheme.up : MarketsTheme.down)
                            }
                            QuoteChangeText(quote: row.quote)
                        }
                    }
                }
                .padding(.vertical, 8)
                Divider().overlay(MarketsTheme.border)
            }
        }
    }

    private var topStoriesCard: some View {
        SectionCard(title: "Top Stories", subtitle: "Finnhub general market news") {
            if market.topStories.isEmpty {
                Text(market.isLoading ? "Loading…" : "No stories yet.")
                    .foregroundStyle(MarketsTheme.muted)
            } else {
                ForEach(market.topStories) { article in
                    NewsRow(article: article)
                    Divider().overlay(MarketsTheme.border)
                }
            }
        }
    }
}
