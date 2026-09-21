import Foundation

struct MarketSymbol: Identifiable, Hashable {
    var id: String { ticker }
    var ticker: String
    var name: String
}

struct MarketSector: Identifiable, Hashable {
    var id: String { title }
    var title: String
    var symbols: [MarketSymbol]
}

enum MarketCatalog {
    /// Mirrors TradingView Market Overview / Quotes groups from the web app.
    static let sectors: [MarketSector] = [
        MarketSector(title: "Financial", symbols: [
            .init(ticker: "JPM", name: "JPMorgan Chase"),
            .init(ticker: "WFC", name: "Wells Fargo"),
            .init(ticker: "BAC", name: "Bank of America"),
            .init(ticker: "HSBC", name: "HSBC Holdings"),
            .init(ticker: "C", name: "Citigroup"),
            .init(ticker: "MA", name: "Mastercard"),
        ]),
        MarketSector(title: "Technology", symbols: [
            .init(ticker: "AAPL", name: "Apple"),
            .init(ticker: "GOOGL", name: "Alphabet"),
            .init(ticker: "MSFT", name: "Microsoft"),
            .init(ticker: "META", name: "Meta Platforms"),
            .init(ticker: "ORCL", name: "Oracle"),
            .init(ticker: "INTC", name: "Intel"),
        ]),
        MarketSector(title: "Services", symbols: [
            .init(ticker: "AMZN", name: "Amazon"),
            .init(ticker: "BABA", name: "Alibaba"),
            .init(ticker: "T", name: "AT&T"),
            .init(ticker: "WMT", name: "Walmart"),
            .init(ticker: "V", name: "Visa"),
        ]),
    ]

    static var allTickers: [String] {
        sectors.flatMap { $0.symbols.map(\.ticker) }
    }

    /// Broader set for heatmap-style mosaic (approx of SPX heatmap).
    static let heatmapTickers: [String] = [
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "BRK.B", "TSLA",
        "JPM", "V", "UNH", "XOM", "MA", "PG", "JNJ", "HD",
        "COST", "ABBV", "AVGO", "MRK", "PEP", "KO", "WMT", "BAC",
        "CRM", "CSCO", "ACN", "MCD", "TMO", "ABT", "LIN", "DHR",
    ]

    static let popular: [String] = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "JPM", "V",
    ]
}
