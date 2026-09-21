import SwiftUI

enum MarketsTheme {
    static let bg = Color(red: 0.06, green: 0.06, blue: 0.07)
    static let card = Color(red: 0.08, green: 0.08, blue: 0.09)
    static let border = Color.white.opacity(0.08)
    static let text = Color(red: 0.92, green: 0.92, blue: 0.94)
    static let muted = Color(red: 0.55, green: 0.55, blue: 0.58)
    static let accent = Color(red: 0.06, green: 0.93, blue: 0.75)
    static let up = Color(red: 0.20, green: 0.78, blue: 0.55)
    static let down = Color(red: 0.94, green: 0.35, blue: 0.35)
}

enum MarketsConfig {
    static var finnhubAPIKey: String {
        let raw = Bundle.main.object(forInfoDictionaryKey: "FinnhubAPIKey") as? String
        return raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }

    static var adanosAPIKey: String {
        let raw = Bundle.main.object(forInfoDictionaryKey: "AdanosAPIKey") as? String
        return raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }

    static var adanosBaseURL: String {
        let raw = Bundle.main.object(forInfoDictionaryKey: "AdanosBaseURL") as? String
        let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "https://api.adanos.org" : trimmed
    }

    /// Mirrors the local web watchlist (`userId: local`) as of seed v2.
    static let watchlistSeedVersion = 2
    static let defaultSymbols = [
        "AXTI", "BILI", "IAU", "QQQY", "QQQI", "YINN", "PDI", "UNH",
        "DFEN", "GBTC", "JEPI", "DBC", "OMFL", "IYW", "SGOV", "TLT",
        "SCHD", "AAPL",
    ]
}

enum Formatters {
    static func money(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "—" }
        return value.formatted(.currency(code: "USD").precision(.fractionLength(2)))
    }

    static func pct(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "—" }
        return String(format: "%@%.2f%%", value >= 0 ? "+" : "", value)
    }

    static func compactMillions(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "—" }
        if value >= 1_000_000 { return String(format: "%.2fT", value / 1_000_000) }
        if value >= 1_000 { return String(format: "%.2fB", value / 1_000) }
        return String(format: "%.2fM", value)
    }

    static func compactCount(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "—" }
        let abs = abs(value)
        if abs >= 1_000_000_000 { return String(format: "%.2fB", value / 1_000_000_000) }
        if abs >= 1_000_000 { return String(format: "%.2fM", value / 1_000_000) }
        if abs >= 1_000 { return String(format: "%.2fK", value / 1_000) }
        return String(format: "%.0f", value)
    }

    static func day(_ date: Date?) -> String {
        guard let date else { return "—" }
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}
