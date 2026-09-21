import SwiftUI

struct SymbolPanelsView: View {
    let symbol: String
    let company: String

    @State private var candles: [CandlePoint] = []
    @State private var fundamentals: CompanyFundamentals?
    @State private var sentiment: SentimentInsights?
    @State private var loading = true
    @State private var showCharts = false
    @State private var showFundamentals = false

    @EnvironmentObject private var store: WatchlistStore
    /// Heavy cards are only inserted into the lazy stack while the scroll is at rest;
    /// mid-scroll insertion crashes UICollectionView-backed ScrollViews on iOS 26.
    @Environment(\.scrollSettled) private var scrollSettled

    private var quote: Quote? { store.quotes[symbol] }
    private var profile: CompanyProfile? { store.profiles[symbol] ?? fundamentals?.profile }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            symbolInfoCard

            if showCharts, scrollSettled {
                candleCard
                baselineCard
            }

            if let sentiment {
                sentimentCard(sentiment)
            }

            if showFundamentals, scrollSettled {
                FundamentalsPanelsView(fundamentals: fundamentals, loading: loading)
            }
        }
        .task(id: symbol) {
            await load()
            await Task.yield()
            showCharts = true
            await Task.yield()
            showFundamentals = true
        }
    }

    private var symbolInfoCard: some View {
        SectionCard(title: "\(symbol)", subtitle: company) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    if let exchange = profile?.exchange {
                        Text(exchange)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(MarketsTheme.muted)
                    }
                    if let industry = profile?.industry {
                        Text("· \(industry)")
                            .font(.caption)
                            .foregroundStyle(MarketsTheme.muted)
                            .lineLimit(1)
                    }
                }
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(Formatters.money(quote?.price))
                        .font(.largeTitle.monospacedDigit().weight(.bold))
                        .foregroundStyle(MarketsTheme.text)
                    if let quote {
                        let change = quote.change.isFinite ? quote.change : 0
                        Text(String(format: "%@%.2f (%@)", quote.isUp ? "+" : "", change, Formatters.pct(quote.changePercent)))
                            .font(.headline.monospacedDigit())
                            .foregroundStyle(quote.isUp ? MarketsTheme.up : MarketsTheme.down)
                    }
                }
                HStack(spacing: 16) {
                    miniStat("Open", Formatters.money(quote?.open))
                    miniStat("High", Formatters.money(quote?.high))
                    miniStat("Low", Formatters.money(quote?.low))
                    miniStat("Vol", Formatters.compactCount(quote?.volume ?? fundamentals?.keyStats.volume))
                }
            }
        }
    }

    private var candleCard: some View {
        SectionCard(title: "Candle Chart", subtitle: "Daily OHLC") {
            if loading && candles.isEmpty {
                ProgressView().frame(maxWidth: .infinity, minHeight: 180)
            } else {
                PriceChartView(points: candles, mode: .candle)
            }
        }
    }

    private var baselineCard: some View {
        SectionCard(title: "Baseline Chart", subtitle: "Close price trend") {
            if loading && candles.isEmpty {
                ProgressView().frame(maxWidth: .infinity, minHeight: 180)
            } else {
                PriceChartView(points: candles, mode: .baseline)
            }
        }
    }

    private func sentimentCard(_ insight: SentimentInsights) -> some View {
        SectionCard(title: "Sentiment Insights", subtitle: "\(insight.symbol) across social and public channels") {
            HStack(spacing: 12) {
                sentimentStat("Avg Buzz", insight.averageBuzz.flatMap { $0.isFinite ? String(format: "%.1f", $0) : nil } ?? "N/A")
                sentimentStat("Bullish", insight.bullishAverage.flatMap { $0.isFinite ? String(format: "%.1f%%", $0) : nil } ?? "N/A")
                sentimentStat("Alignment", insight.sourceAlignment)
            }
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(insight.sources) { source in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(source.name)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(MarketsTheme.muted)
                        Text(source.available ? (source.bullish.flatMap { $0.isFinite ? String(format: "%.0f%% bullish", $0) : nil } ?? "Available") : "No data")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(MarketsTheme.text)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(MarketsTheme.bg, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
    }

    private func miniStat(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption2).foregroundStyle(MarketsTheme.muted)
            Text(value).font(.caption.monospacedDigit().weight(.semibold)).foregroundStyle(MarketsTheme.text)
        }
    }

    private func sentimentStat(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(MarketsTheme.muted)
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(MarketsTheme.text)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(MarketsTheme.bg, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func load() async {
        loading = true
        defer { loading = false }
        async let c = FinnhubClient.shared.candles(symbol: symbol, days: 180)
        async let f = FinnhubClient.shared.fundamentals(symbol: symbol)
        async let s = AdanosClient.shared.sentiment(symbol: symbol)
        candles = (try? await c).map { CandlePoint.sanitized($0, limit: 90) } ?? []
        fundamentals = try? await f
        sentiment = await s
        if store.quotes[symbol] == nil {
            await store.refreshQuotes(symbols: [symbol])
        }
    }
}
