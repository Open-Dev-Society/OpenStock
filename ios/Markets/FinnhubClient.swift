import Foundation

actor FinnhubClient {
    static let shared = FinnhubClient()

    private let base = "https://finnhub.io/api/v1"
    private let session: URLSession
    private var candleCache: [String: [CandlePoint]] = [:]

    init(session: URLSession = .shared) {
        self.session = session
    }

    private var token: String { MarketsConfig.finnhubAPIKey }
    nonisolated var hasAPIKey: Bool { !MarketsConfig.finnhubAPIKey.isEmpty }

    private struct NewsDTO: Decodable {
        let id: Int?
        let headline: String?
        let summary: String?
        let source: String?
        let url: String?
        let datetime: TimeInterval?
        let image: String?
        let related: String?
    }

    private func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        guard hasAPIKey else { throw FinnhubError.missingAPIKey }
        var items = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        items.append(URLQueryItem(name: "token", value: token))
        let trimmed = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        var components = URLComponents(string: "\(base)/\(trimmed)")!
        components.queryItems = items
        guard let url = components.url else { throw FinnhubError.badURL }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse else { throw FinnhubError.badResponse }
        guard (200..<300).contains(http.statusCode) else { throw FinnhubError.http(http.statusCode) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func mapNews(_ row: NewsDTO, fallbackRelated: String) -> NewsArticle? {
        guard let headline = row.headline, !headline.isEmpty else { return nil }
        let id = row.id.map(String.init) ?? "\(fallbackRelated)-\(headline.hashValue)"
        let related = (row.related?.isEmpty == false) ? row.related! : fallbackRelated
        return NewsArticle(
            id: id,
            headline: headline,
            summary: row.summary ?? "",
            source: row.source ?? "",
            url: row.url.flatMap(URL.init(string:)),
            datetime: Date(timeIntervalSince1970: row.datetime ?? 0),
            imageURL: row.image.flatMap(URL.init(string:)),
            related: related
        )
    }

    func quote(symbol: String) async throws -> Quote? {
        struct Raw: Decodable {
            let c: Double?; let d: Double?; let dp: Double?
            let h: Double?; let l: Double?; let o: Double?; let pc: Double?
            let v: Double?
        }
        let raw: Raw = try await get("quote", query: ["symbol": symbol])
        guard let c = raw.c, c > 0 else { return nil }
        return Quote(
            price: c, change: raw.d ?? 0, changePercent: raw.dp ?? 0,
            high: raw.h, low: raw.l, open: raw.o, previousClose: raw.pc,
            volume: raw.v
        )
    }

    func profile(symbol: String) async throws -> CompanyProfile? {
        struct Raw: Decodable {
            let name: String?
            let exchange: String?
            let logo: String?
            let marketCapitalization: Double?
            let weburl: String?
            let employeeTotal: Int?
            let finnhubIndustry: String?
            let country: String?
            let ipo: String?
            let isin: String?
            let cusip: String?
            let ticker: String?
        }
        // profile2 is free-tier friendly; merge richer fields when present
        let raw: Raw = try await get("stock/profile2", query: ["symbol": symbol])
        guard let name = raw.name, !name.isEmpty else { return nil }

        var isin = raw.isin
        var cusip = raw.cusip
        var employees = raw.employeeTotal
        var website = raw.weburl
        // Best-effort richer profile (may 403 on free plan)
        if let rich: Raw = try? await get("stock/profile", query: ["symbol": symbol]) {
            isin = isin ?? rich.isin
            cusip = cusip ?? rich.cusip
            employees = employees ?? rich.employeeTotal
            website = website ?? rich.weburl
        }

        return CompanyProfile(
            name: name,
            exchange: raw.exchange ?? "US",
            logoURL: raw.logo.flatMap(URL.init(string:)),
            marketCap: raw.marketCapitalization,
            website: website.flatMap(URL.init(string:)),
            employees: employees,
            isin: isin,
            cusip: cusip,
            ipo: raw.ipo,
            country: raw.country,
            industry: raw.finnhubIndustry
        )
    }

    func search(query: String) async throws -> [(symbol: String, description: String)] {
        struct Hit: Decodable { let symbol: String?; let description: String? }
        struct Raw: Decodable { let result: [Hit]? }
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            var out: [(String, String)] = []
            for sym in MarketCatalog.popular {
                if let p = try? await profile(symbol: sym) {
                    out.append((sym, p.name))
                } else {
                    out.append((sym, sym))
                }
            }
            return out
        }
        let raw: Raw = try await get("search", query: ["q": trimmed])
        return (raw.result ?? []).compactMap { hit in
            guard let symbol = hit.symbol, !symbol.isEmpty else { return nil }
            return (symbol, hit.description ?? symbol)
        }.prefix(15).map { $0 }
    }

    func companyNews(symbol: String, days: Int = 5) async throws -> [NewsArticle] {
        let to = Date()
        let from = Calendar.current.date(byAdding: .day, value: -days, to: to) ?? to
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        let rows: [NewsDTO] = try await get(
            "company-news",
            query: ["symbol": symbol, "from": fmt.string(from: from), "to": fmt.string(from: to)]
        )
        return rows.compactMap { mapNews($0, fallbackRelated: symbol) }
    }

    func generalNews(limit: Int = 15) async throws -> [NewsArticle] {
        let rows: [NewsDTO] = try await get("news", query: ["category": "general"])
        return Array(rows.prefix(limit).compactMap { mapNews($0, fallbackRelated: "MARKET") })
    }

    func watchlistNews(symbols: [String], limit: Int = 12) async throws -> [NewsArticle] {
        guard !symbols.isEmpty else { return try await generalNews(limit: limit) }
        var buckets: [[NewsArticle]] = []
        for symbol in symbols.prefix(8) {
            buckets.append((try? await companyNews(symbol: symbol)) ?? [])
        }
        var out: [NewsArticle] = []
        var seen = Set<String>()
        var index = 0
        while out.count < limit {
            var added = false
            for b in buckets.indices {
                if index < buckets[b].count {
                    let article = buckets[b][index]
                    if seen.insert(article.headline).inserted {
                        out.append(article)
                        added = true
                        if out.count >= limit { break }
                    }
                }
            }
            if !added { break }
            index += 1
        }
        return out.isEmpty ? try await generalNews(limit: limit) : out
    }

    func candles(symbol: String, days: Int = 180) async throws -> [CandlePoint] {
        if let cached = candleCache[symbol], !cached.isEmpty { return cached }
        struct Raw: Decodable {
            let o: [Double]?; let h: [Double]?; let l: [Double]?
            let c: [Double]?; let v: [Double]?; let t: [TimeInterval]?; let s: String?
        }
        let to = Int(Date().timeIntervalSince1970)
        let from = to - days * 86_400
        let raw: Raw = try await get(
            "stock/candle",
            query: ["symbol": symbol, "resolution": "D", "from": String(from), "to": String(to)]
        )
        guard raw.s == "ok",
              let closes = raw.c, let times = raw.t,
              let opens = raw.o, let highs = raw.h, let lows = raw.l,
              closes.count == times.count else { return [] }
        let volumes = raw.v ?? Array(repeating: 0, count: closes.count)
        let points: [CandlePoint] = times.indices.map { i in
            CandlePoint(
                time: Date(timeIntervalSince1970: times[i]),
                open: opens[i], high: highs[i], low: lows[i], close: closes[i],
                volume: i < volumes.count ? volumes[i] : 0
            )
        }
        candleCache[symbol] = points
        return points
    }

    func basicFinancials(symbol: String) async throws -> CompanyFundamentals? {
        try await fundamentals(symbol: symbol)
    }

    func fundamentals(symbol: String) async throws -> CompanyFundamentals? {
        let upper = symbol.uppercased()
        async let quoteTask = quote(symbol: upper)
        async let profileTask = profile(symbol: upper)
        async let metricTask: MetricPayload? = try? await get("stock/metric", query: ["symbol": upper, "metric": "all"])
        async let earningsTask = earnings(symbol: upper, limit: 4)
        async let nextEarnTask = nextEarningsDate(symbol: upper)
        async let divTask = dividends(symbol: upper)
        async let incomeAnnualTask = incomeStatement(symbol: upper, freq: "annual")
        async let incomeQuarterTask = incomeStatement(symbol: upper, freq: "quarterly")

        let q = try? await quoteTask
        let p = try? await profileTask
        let metricPayload = await metricTask
        let m = metricPayload?.metric ?? [:]

        let name = (p?.name ?? "").lowercased()
        let kind = (name.contains("etf") || name.contains("fund")) ? "fund" : "stock"

        let nextDate = await nextEarnTask
        var daysTo: Int?
        if let nextDate {
            daysTo = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Calendar.current.startOfDay(for: nextDate)).day
        }

        let key = KeyStats(
            marketCap: num(m, "marketCapitalization") ?? p?.marketCap,
            pe: num(m, "peBasicExclExtraTTM") ?? num(m, "peNormalizedAnnual") ?? num(m, "peTTM"),
            eps: num(m, "epsBasicExclExtraItemsTTM") ?? num(m, "epsTTM"),
            dividendYield: num(m, "dividendYieldIndicatedAnnual") ?? num(m, "dividendYieldTTM"),
            beta: num(m, "beta"),
            week52High: num(m, "52WeekHigh"),
            week52Low: num(m, "52WeekLow"),
            volume: q?.volume ?? num(m, "10DayAverageTradingVolume"),
            avgVolume10d: num(m, "10DayAverageTradingVolume"),
            avgVolume30d: num(m, "3MonthAverageTradingVolume") ?? num(m, "30DayAverageTradingVolume"),
            nextEarningsDate: nextDate,
            daysToEarnings: daysTo
        )

        let perf = PerformanceStats(
            return1w: num(m, "5DayPriceReturnDaily") ?? num(m, "1WeekPriceReturnDaily"),
            return1m: num(m, "monthToDatePriceReturnDaily") ?? num(m, "1MonthPriceReturnDaily"),
            return3m: num(m, "13WeekPriceReturnDaily"),
            return6m: num(m, "26WeekPriceReturnDaily"),
            returnYtd: num(m, "yearToDatePriceReturnDaily"),
            return1y: num(m, "52WeekPriceReturnDaily")
        )

        return CompanyFundamentals(
            kind: kind,
            keyStats: key,
            performance: perf,
            earnings: await earningsTask,
            dividends: await divTask,
            incomeAnnual: await incomeAnnualTask,
            incomeQuarterly: await incomeQuarterTask,
            profile: p
        )
    }

    func earnings(symbol: String, limit: Int = 4) async -> [EarningsQuarter] {
        struct Row: Decodable {
            let actual: Double?
            let estimate: Double?
            let period: String?
            let quarter: Int?
            let surprisePercent: Double?
            let year: Int?
        }
        let rows: [Row]
        do {
            rows = try await get("stock/earnings", query: ["symbol": symbol, "limit": String(limit)])
        } catch {
            return []
        }
        return rows.prefix(limit).compactMap { row in
            guard let period = row.period else { return nil }
            return EarningsQuarter(
                period: period,
                year: row.year ?? 0,
                quarter: row.quarter ?? 0,
                actual: row.actual,
                estimate: row.estimate,
                surprisePercent: row.surprisePercent
            )
        }
    }

    func nextEarningsDate(symbol: String) async -> Date? {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        let from = fmt.string(from: Date())
        let toDate = Calendar.current.date(byAdding: .day, value: 180, to: Date()) ?? Date()
        let to = fmt.string(from: toDate)

        struct Earn: Decodable {
            let date: String?
            let symbol: String?
        }
        struct Payload: Decodable { let earningsCalendar: [Earn]? }
        let payload: Payload
        do {
            payload = try await get(
                "calendar/earnings",
                query: ["symbol": symbol, "from": from, "to": to]
            )
        } catch {
            return nil
        }
        let dates = (payload.earningsCalendar ?? [])
            .filter { ($0.symbol ?? symbol).uppercased() == symbol.uppercased() }
            .compactMap { $0.date.flatMap(fmt.date(from:)) }
            .sorted()
        return dates.first
    }

    func dividends(symbol: String) async -> [DividendRow] {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        let to = fmt.string(from: Date())
        let fromDate = Calendar.current.date(byAdding: .year, value: -5, to: Date()) ?? Date()
        let from = fmt.string(from: fromDate)

        struct Row: Decodable {
            let amount: Double?
            let currency: String?
            let exDate: String?
            let payDate: String?
            let date: String?
        }

        if let rows: [Row] = try? await get(
            "stock/dividend",
            query: ["symbol": symbol, "from": from, "to": to]
        ) {
            return rows.prefix(12).enumerated().compactMap { index, row in
                guard let amount = row.amount else { return nil }
                return DividendRow(
                    exDate: (row.exDate ?? row.date).flatMap(fmt.date(from:)),
                    payDate: row.payDate.flatMap(fmt.date(from:)),
                    amount: amount,
                    currency: row.currency,
                    index: index
                )
            }
        }

        struct Basic: Decodable {
            let amount: Double?
            let exDate: String?
            let payDate: String?
        }
        struct BasicPayload: Decodable { let data: [Basic]? }
        if let payload: BasicPayload = try? await get("stock/dividend2", query: ["symbol": symbol]) {
            return (payload.data ?? []).prefix(12).enumerated().compactMap { index, row in
                guard let amount = row.amount else { return nil }
                return DividendRow(
                    exDate: row.exDate.flatMap(fmt.date(from:)),
                    payDate: row.payDate.flatMap(fmt.date(from:)),
                    amount: amount,
                    currency: nil,
                    index: index
                )
            }
        }
        return []
    }

    func incomeStatement(symbol: String, freq: String) async -> [IncomeStatementRow] {
        guard hasAPIKey else { return [] }
        var components = URLComponents(string: "\(base)/stock/financials")!
        components.queryItems = [
            URLQueryItem(name: "symbol", value: symbol),
            URLQueryItem(name: "statement", value: "ic"),
            URLQueryItem(name: "freq", value: freq),
            URLQueryItem(name: "token", value: token),
        ]
        guard let url = components.url else { return [] }

        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return []
            }
            guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let rows = root["financials"] as? [[String: Any]] else {
                return []
            }
            return rows.prefix(8).enumerated().map { index, row in
                let period = (row["period"] as? String)
                    ?? intValue(row["year"]).map(String.init)
                    ?? "—"
                return IncomeStatementRow(
                    period: period,
                    year: intValue(row["year"]),
                    revenue: doubleValue(row["revenue"]) ?? doubleValue(row["sales"]),
                    grossIncome: doubleValue(row["grossIncome"]) ?? doubleValue(row["grossProfit"]),
                    operatingIncome: doubleValue(row["operatingIncome"]),
                    netIncome: doubleValue(row["netIncome"]) ?? doubleValue(row["netIncomeApplicableToCommonShares"]),
                    ebitda: doubleValue(row["ebitda"]) ?? doubleValue(row["EBITDA"]),
                    suffix: "\(freq)-\(index)"
                )
            }
        } catch {
            return []
        }
    }

    private func doubleValue(_ any: Any?) -> Double? {
        if let d = any as? Double { return d }
        if let i = any as? Int { return Double(i) }
        if let n = any as? NSNumber { return n.doubleValue }
        if let s = any as? String { return Double(s) }
        return nil
    }

    private func intValue(_ any: Any?) -> Int? {
        if let i = any as? Int { return i }
        if let d = any as? Double { return Int(d) }
        if let n = any as? NSNumber { return n.intValue }
        if let s = any as? String { return Int(s) }
        return nil
    }

    private struct MetricPayload: Decodable {
        let metric: [String: Double]?
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            let raw = try container.decodeIfPresent([String: FlexibleJSONNumber].self, forKey: .metric) ?? [:]
            var out: [String: Double] = [:]
            for (k, v) in raw {
                if let d = v.value { out[k] = d }
            }
            metric = out
        }
        enum CodingKeys: String, CodingKey { case metric }
    }

    private struct FlexibleJSONNumber: Decodable {
        let value: Double?
        init(from decoder: Decoder) throws {
            let c = try decoder.singleValueContainer()
            if c.decodeNil() { value = nil }
            else if let d = try? c.decode(Double.self) { value = d }
            else if let i = try? c.decode(Int.self) { value = Double(i) }
            else if let s = try? c.decode(String.self) { value = Double(s) }
            else { value = nil }
        }
    }

    private func num(_ metric: [String: Double], _ key: String) -> Double? {
        metric[key]
    }
}

enum FinnhubError: LocalizedError {
    case missingAPIKey, badURL, badResponse, http(Int)
    var errorDescription: String? {
        switch self {
        case .missingAPIKey: return "Finnhub API key missing."
        case .badURL: return "Invalid Finnhub URL"
        case .badResponse: return "Invalid Finnhub response"
        case .http(let c): return "Finnhub HTTP \(c)"
        }
    }
}
