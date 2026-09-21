import Foundation
import Combine

@MainActor
final class WatchlistStore: ObservableObject {
    @Published private(set) var items: [WatchlistItem] = []
    @Published private(set) var quotes: [String: Quote] = [:]
    @Published private(set) var profiles: [String: CompanyProfile] = [:]
    @Published var selectedSymbol: String?
    @Published var isRefreshing = false
    @Published var lastError: String?
    @Published var marketNews: [NewsArticle] = []

    private let defaultsKey = "markets.watchlist.v1"
    private let seedVersionKey = "markets.watchlist.seedVersion"

    init() {
        load()
        let appliedSeed = UserDefaults.standard.integer(forKey: seedVersionKey)
        if items.isEmpty || appliedSeed < MarketsConfig.watchlistSeedVersion {
            items = MarketsConfig.defaultSymbols.enumerated().map {
                WatchlistItem(symbol: $0.element, company: $0.element, sortOrder: $0.offset)
            }
            UserDefaults.standard.set(MarketsConfig.watchlistSeedVersion, forKey: seedVersionKey)
            persist()
        }
        selectedSymbol = items.sorted { $0.sortOrder < $1.sortOrder }.first?.symbol
        Task { await refreshAll() }
    }

    var enriched: [EnrichedSymbol] {
        items.sorted { $0.sortOrder < $1.sortOrder }.map {
            EnrichedSymbol(item: $0, quote: quotes[$0.symbol], profile: profiles[$0.symbol])
        }
    }

    var selected: EnrichedSymbol? {
        guard let selectedSymbol else { return enriched.first }
        return enriched.first { $0.item.symbol == selectedSymbol } ?? enriched.first
    }

    func select(_ symbol: String) {
        selectedSymbol = symbol.uppercased()
    }

    func addTickers(_ raw: String) async {
        let parts = raw.uppercased().split { ",;\n\t ".contains($0) }.map(String.init).filter { !$0.isEmpty }
        let pattern = try! NSRegularExpression(pattern: "^[A-Z][A-Z0-9.^\\-]{0,11}$")
        var added: [String] = []
        var nextOrder = (items.map(\.sortOrder).min() ?? 0) - 1

        for part in parts {
            let range = NSRange(part.startIndex..<part.endIndex, in: part)
            guard pattern.firstMatch(in: part, range: range) != nil else { continue }
            guard !items.contains(where: { $0.symbol == part }) else { continue }
            var company = part
            if let profile = try? await FinnhubClient.shared.profile(symbol: part) {
                company = profile.name
                profiles[part] = profile
            }
            items.insert(WatchlistItem(symbol: part, company: company, sortOrder: nextOrder), at: 0)
            nextOrder -= 1
            added.append(part)
        }
        renumber()
        persist()
        if let first = added.first { selectedSymbol = first }
        await refreshQuotes(symbols: added)
        await refreshMarketNews()
    }

    func removeSelected() {
        guard let symbol = selectedSymbol ?? selected?.item.symbol else { return }
        remove(symbol)
    }

    func remove(_ symbol: String) {
        let upper = symbol.uppercased()
        items.removeAll { $0.symbol == upper }
        quotes.removeValue(forKey: upper)
        profiles.removeValue(forKey: upper)
        renumber()
        persist()
        if selectedSymbol == upper {
            selectedSymbol = items.sorted { $0.sortOrder < $1.sortOrder }.first?.symbol
        }
        Task { await refreshMarketNews() }
    }

    func move(from source: IndexSet, to destination: Int) {
        var ordered = enriched.map(\.item)
        ordered.move(fromOffsets: source, toOffset: destination)
        items = ordered.enumerated().map { index, item in
            var copy = item
            copy.sortOrder = index
            return copy
        }
        persist()
    }

    func refreshAll() async {
        await refreshQuotes()
        await refreshMarketNews()
    }

    func refreshQuotes(symbols: [String]? = nil) async {
        guard MarketsConfig.finnhubAPIKey.isEmpty == false else {
            lastError = FinnhubError.missingAPIKey.localizedDescription
            return
        }
        isRefreshing = true
        defer { isRefreshing = false }
        let targets = symbols ?? items.map(\.symbol)
        await withTaskGroup(of: (String, Quote?, CompanyProfile?).self) { group in
            for symbol in targets {
                group.addTask {
                    async let q = try? await FinnhubClient.shared.quote(symbol: symbol)
                    async let p = try? await FinnhubClient.shared.profile(symbol: symbol)
                    return (symbol, await q, await p)
                }
            }
            for await (symbol, quote, profile) in group {
                if let quote { quotes[symbol] = quote }
                if let profile {
                    profiles[symbol] = profile
                    if let idx = items.firstIndex(where: { $0.symbol == symbol }) {
                        items[idx].company = profile.name
                    }
                }
            }
        }
        persist()
        lastError = nil
    }

    func refreshMarketNews() async {
        let symbols = items.map(\.symbol)
        let raw = (try? await FinnhubClient.shared.watchlistNews(symbols: symbols, limit: 12)) ?? []
        marketNews = NewsArticle.deduplicated(raw, limit: 12)
    }

    private func renumber() {
        let ordered = items.sorted { $0.sortOrder < $1.sortOrder }
        items = ordered.enumerated().map { index, item in
            var copy = item
            copy.sortOrder = index
            return copy
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: defaultsKey) else { return }
        if let decoded = try? JSONDecoder().decode([WatchlistItem].self, from: data) {
            items = decoded
        }
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: defaultsKey)
        }
    }
}

@MainActor
final class MarketDataStore: ObservableObject {
    @Published var sectorIndex = 0
    @Published var overviewRows: [MarketRow] = []
    @Published var quoteRows: [MarketRow] = []
    @Published var heatmapRows: [MarketRow] = []
    @Published var topStories: [NewsArticle] = []
    @Published var selectedOverviewSymbol: String?
    @Published var isLoading = false

    func load() async {
        guard MarketsConfig.finnhubAPIKey.isEmpty == false else { return }
        isLoading = true
        defer { isLoading = false }

        async let stories = FinnhubClient.shared.generalNews(limit: 15)
        async let heat = loadRows(tickers: MarketCatalog.heatmapTickers, withSparklines: false)
        topStories = NewsArticle.deduplicated((try? await stories) ?? [], limit: 15)
        heatmapRows = await heat
        await refreshSector()
    }

    func refreshSector() async {
        let sector = MarketCatalog.sectors[min(sectorIndex, MarketCatalog.sectors.count - 1)]
        let rows = await loadRows(tickers: sector.symbols.map(\.ticker), names: Dictionary(uniqueKeysWithValues: sector.symbols.map { ($0.ticker, $0.name) }), withSparklines: true)
        overviewRows = rows
        quoteRows = rows
        if selectedOverviewSymbol == nil || !rows.contains(where: { $0.ticker == selectedOverviewSymbol }) {
            selectedOverviewSymbol = rows.first?.ticker
        }
    }

    private func loadRows(tickers: [String], names: [String: String] = [:], withSparklines: Bool) async -> [MarketRow] {
        await withTaskGroup(of: MarketRow.self) { group in
            for ticker in tickers {
                group.addTask {
                    let quote = try? await FinnhubClient.shared.quote(symbol: ticker)
                    var spark: [CandlePoint] = []
                    if withSparklines {
                        spark = Array(((try? await FinnhubClient.shared.candles(symbol: ticker, days: 90)) ?? []).suffix(40))
                    }
                    let name: String
                    if let provided = names[ticker] {
                        name = provided
                    } else if let profile = try? await FinnhubClient.shared.profile(symbol: ticker) {
                        name = profile.name
                    } else {
                        name = ticker
                    }
                    return MarketRow(ticker: ticker, name: name, quote: quote, sparkline: spark)
                }
            }
            var out: [MarketRow] = []
            for await row in group { out.append(row) }
            let order = Dictionary(uniqueKeysWithValues: tickers.enumerated().map { ($0.element, $0.offset) })
            return out.sorted { (order[$0.ticker] ?? 0) < (order[$1.ticker] ?? 0) }
        }
    }
}
