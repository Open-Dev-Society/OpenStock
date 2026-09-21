import Foundation

actor TickerTickClient {
    static let shared = TickerTickClient()
    private let session: URLSession
    init(session: URLSession = .shared) { self.session = session }

    func news(symbol: String, limit: Int = 12) async throws -> [NewsArticle] {
        var components = URLComponents(string: "https://api.tickertick.com/feed")!
        components.queryItems = [
            URLQueryItem(name: "q", value: "z:\(symbol.lowercased())"),
            URLQueryItem(name: "n", value: String(limit)),
        ]
        guard let url = components.url else { return [] }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            return []
        }
        struct Story: Decodable {
            let id: String?; let title: String?; let url: String?
            let site: String?; let time: Double?; let description: String?
        }
        struct Feed: Decodable { let stories: [Story]? }
        let feed = try JSONDecoder().decode(Feed.self, from: data)
        return (feed.stories ?? []).compactMap { story in
            guard let title = story.title, !title.isEmpty else { return nil }
            let millis = story.time ?? 0
            let date = Date(timeIntervalSince1970: millis > 10_000_000_000 ? millis / 1000 : millis)
            return NewsArticle(
                id: story.id ?? "\(symbol)-\(title.hashValue)",
                headline: title,
                summary: story.description ?? "",
                source: story.site ?? "",
                url: story.url.flatMap(URL.init(string:)),
                datetime: date,
                imageURL: nil,
                related: symbol
            )
        }
    }
}
