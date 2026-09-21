import Foundation

struct WatchlistItem: Identifiable, Codable, Hashable {
    var id: String { symbol }
    var symbol: String
    var company: String
    var sortOrder: Int
    var addedAt: Date

    init(symbol: String, company: String = "", sortOrder: Int = 0, addedAt: Date = .now) {
        self.symbol = symbol.uppercased()
        self.company = company
        self.sortOrder = sortOrder
        self.addedAt = addedAt
    }
}

struct Quote: Hashable {
    var price: Double
    var change: Double
    var changePercent: Double
    var high: Double?
    var low: Double?
    var open: Double?
    var previousClose: Double?
    var volume: Double?

    var isUp: Bool { changePercent >= 0 }
}

struct CompanyProfile: Hashable {
    var name: String
    var exchange: String
    var logoURL: URL?
    var marketCap: Double?
    var website: URL?
    var employees: Int?
    var isin: String?
    var cusip: String?
    var ipo: String?
    var country: String?
    var industry: String?
}

struct NewsArticle: Identifiable, Hashable {
    var id: String
    var headline: String
    var summary: String
    var source: String
    var url: URL?
    var datetime: Date
    var imageURL: URL?
    var related: String

    /// Finnhub/TickerTick often reuse ids — duplicate ForEach ids abort the process.
    static func deduplicated(_ articles: [NewsArticle], limit: Int) -> [NewsArticle] {
        var seen = Set<String>()
        var unique: [NewsArticle] = []
        for (index, article) in articles.sorted(by: { $0.datetime > $1.datetime }).enumerated() {
            let candidates = [article.id, article.url?.absoluteString ?? "", article.headline]
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            let base = candidates.first ?? "news-\(index)"
            var key = base
            var suffix = 0
            while seen.contains(key) {
                suffix += 1
                key = "\(base)-\(suffix)"
            }
            seen.insert(key)
            var copy = article
            copy.id = key
            unique.append(copy)
            if unique.count >= limit { break }
        }
        return unique
    }
}

struct CandlePoint: Identifiable, Hashable {
    var id: Date { time }
    var time: Date
    var open: Double
    var high: Double
    var low: Double
    var close: Double
    var volume: Double

    var isFinite: Bool {
        time.timeIntervalSince1970.isFinite
            && open.isFinite && high.isFinite && low.isFinite && close.isFinite
            && volume.isFinite
            && high >= low
            && close > 0
    }

    /// Drop invalid points and cap count — Charts inside scroll views crash on NaNs / huge series.
    static func sanitized(_ points: [CandlePoint], limit: Int = 120) -> [CandlePoint] {
        Array(points.filter(\.isFinite).suffix(limit))
    }
}

struct KeyStats: Hashable {
    var marketCap: Double?
    var pe: Double?
    var eps: Double?
    var dividendYield: Double?
    var beta: Double?
    var week52High: Double?
    var week52Low: Double?
    var volume: Double?
    var avgVolume10d: Double?
    var avgVolume30d: Double?
    var nextEarningsDate: Date?
    var daysToEarnings: Int?
}

struct PerformanceStats: Hashable {
    var return1w: Double?
    var return1m: Double?
    var return3m: Double?
    var return6m: Double?
    var returnYtd: Double?
    var return1y: Double?
}

struct EarningsQuarter: Identifiable, Hashable {
    var id: String
    var period: String
    var year: Int
    var quarter: Int
    var actual: Double?
    var estimate: Double?
    var surprisePercent: Double?

    init(period: String, year: Int, quarter: Int, actual: Double?, estimate: Double?, surprisePercent: Double?) {
        self.period = period
        self.year = year
        self.quarter = quarter
        self.actual = actual
        self.estimate = estimate
        self.surprisePercent = surprisePercent
        self.id = "\(period)-\(year)-\(quarter)-\(actual ?? -1)-\(estimate ?? -1)"
    }
}

struct DividendRow: Identifiable, Hashable {
    var id: String
    var exDate: Date?
    var payDate: Date?
    var amount: Double
    var currency: String?

    init(exDate: Date?, payDate: Date?, amount: Double, currency: String?, index: Int = 0) {
        self.exDate = exDate
        self.payDate = payDate
        self.amount = amount
        self.currency = currency
        self.id = "\(exDate?.timeIntervalSince1970 ?? 0)-\(payDate?.timeIntervalSince1970 ?? 0)-\(amount)-\(index)"
    }
}

struct IncomeStatementRow: Identifiable, Hashable {
    var id: String
    var period: String
    var year: Int?
    var revenue: Double?
    var grossIncome: Double?
    var operatingIncome: Double?
    var netIncome: Double?
    var ebitda: Double?

    init(
        period: String,
        year: Int?,
        revenue: Double?,
        grossIncome: Double?,
        operatingIncome: Double?,
        netIncome: Double?,
        ebitda: Double?,
        suffix: String = ""
    ) {
        self.period = period
        self.year = year
        self.revenue = revenue
        self.grossIncome = grossIncome
        self.operatingIncome = operatingIncome
        self.netIncome = netIncome
        self.ebitda = ebitda
        self.id = period.isEmpty ? "income-\(suffix)" : "\(period)-\(suffix)"
    }
}

struct CompanyFundamentals: Hashable {
    var kind: String
    var keyStats: KeyStats
    var performance: PerformanceStats
    var earnings: [EarningsQuarter]
    var dividends: [DividendRow]
    var incomeAnnual: [IncomeStatementRow]
    var incomeQuarterly: [IncomeStatementRow]
    var profile: CompanyProfile?
}

struct SentimentSource: Identifiable, Hashable {
    var id: String { name }
    var name: String
    var buzz: Double?
    var bullish: Double?
    var available: Bool
}

struct SentimentInsights: Hashable {
    var symbol: String
    var companyName: String?
    var averageBuzz: Double?
    var bullishAverage: Double?
    var sourceAlignment: String
    var sources: [SentimentSource]
}

struct EnrichedSymbol: Identifiable, Hashable {
    var id: String { item.symbol }
    var item: WatchlistItem
    var quote: Quote?
    var profile: CompanyProfile?

    var displayName: String {
        let name = profile?.name ?? item.company
        return name.isEmpty ? item.symbol : name
    }
}

struct MarketRow: Identifiable, Hashable {
    var id: String { ticker }
    var ticker: String
    var name: String
    var quote: Quote?
    var sparkline: [CandlePoint]
}
