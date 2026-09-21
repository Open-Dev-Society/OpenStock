import Foundation

actor AdanosClient {
    static let shared = AdanosClient()

    private let session: URLSession
    init(session: URLSession = .shared) { self.session = session }

    nonisolated var hasAPIKey: Bool { !MarketsConfig.adanosAPIKey.isEmpty }

    private let sources: [(name: String, path: String)] = [
        ("Reddit", "/reddit/stocks/v1/compare"),
        ("X", "/x/stocks/v1/compare"),
        ("News", "/news/stocks/v1/compare"),
        ("Polymarket", "/polymarket/stocks/v1/compare"),
    ]

    func sentiment(symbol: String, days: Int = 7) async -> SentimentInsights? {
        guard hasAPIKey else { return nil }
        let upper = symbol.uppercased()
        var collected: [SentimentSource] = []

        await withTaskGroup(of: SentimentSource.self) { group in
            for source in sources {
                group.addTask {
                    await self.fetchSource(source.name, path: source.path, symbol: upper, days: days)
                }
            }
            for await row in group {
                collected.append(row)
            }
        }

        let available = collected.filter(\.available)
        guard !available.isEmpty else { return nil }

        let buzzValues = available.compactMap(\.buzz)
        let bullishValues = available.compactMap(\.bullish)
        let avgBuzz = buzzValues.isEmpty ? nil : buzzValues.reduce(0, +) / Double(buzzValues.count)
        let avgBull = bullishValues.isEmpty ? nil : bullishValues.reduce(0, +) / Double(bullishValues.count)

        let alignment: String
        if bullishValues.count <= 1 {
            alignment = "Single-source view"
        } else {
            let spread = (bullishValues.max() ?? 0) - (bullishValues.min() ?? 0)
            if spread < 10 { alignment = "Tight alignment" }
            else if (avgBull ?? 50) >= 60 { alignment = "Bullish alignment" }
            else if (avgBull ?? 50) <= 40 { alignment = "Bearish alignment" }
            else if spread > 30 { alignment = "Wide divergence" }
            else { alignment = "Mixed" }
        }

        return SentimentInsights(
            symbol: upper,
            companyName: nil,
            averageBuzz: avgBuzz,
            bullishAverage: avgBull,
            sourceAlignment: alignment,
            sources: collected.sorted { $0.name < $1.name }
        )
    }

    private func fetchSource(_ name: String, path: String, symbol: String, days: Int) async -> SentimentSource {
        let base = MarketsConfig.adanosBaseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard var components = URLComponents(string: base + path) else {
            return SentimentSource(name: name, buzz: nil, bullish: nil, available: false)
        }
        components.queryItems = [
            URLQueryItem(name: "tickers", value: symbol),
            URLQueryItem(name: "days", value: String(days)),
        ]
        guard let url = components.url else {
            return SentimentSource(name: name, buzz: nil, bullish: nil, available: false)
        }

        var request = URLRequest(url: url, timeoutInterval: 5)
        request.setValue(MarketsConfig.adanosAPIKey, forHTTPHeaderField: "X-API-Key")

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return SentimentSource(name: name, buzz: nil, bullish: nil, available: false)
            }
            struct Stock: Decodable {
                let ticker: String?
                let buzz: Double?
                let bullish_percent: Double?
                let bullishPercent: Double?
            }
            struct Payload: Decodable { let stocks: [Stock]? }
            let payload = try JSONDecoder().decode(Payload.self, from: data)
            let row = payload.stocks?.first { $0.ticker?.uppercased() == symbol }
            return SentimentSource(
                name: name,
                buzz: row?.buzz,
                bullish: row?.bullish_percent ?? row?.bullishPercent,
                available: row != nil
            )
        } catch {
            return SentimentSource(name: name, buzz: nil, bullish: nil, available: false)
        }
    }
}
