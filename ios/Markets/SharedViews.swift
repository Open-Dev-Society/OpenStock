import SwiftUI

struct SectionCard<Content: View>: View {
    let title: String
    var subtitle: String? = nil
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(MarketsTheme.text)
                if let subtitle {
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundStyle(MarketsTheme.muted)
                }
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MarketsTheme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(MarketsTheme.border, lineWidth: 1)
        )
    }
}

struct SparklineView: View {
    let points: [CandlePoint]
    var up: Bool = true

    var body: some View {
        let data = CandlePoint.sanitized(points, limit: 40)
        BaselineChart(points: data, line: up ? MarketsTheme.up : MarketsTheme.down, fill: false)
            .frame(height: 28)
    }
}

struct PriceChartView: View {
    enum Mode: String, CaseIterable { case candle = "Candle"; case baseline = "Baseline" }
    let points: [CandlePoint]
    var mode: Mode = .baseline

    var body: some View {
        let data = CandlePoint.sanitized(points, limit: 90)
        Group {
            if data.count < 2 {
                Text("Chart data unavailable")
                    .font(.subheadline)
                    .foregroundStyle(MarketsTheme.muted)
                    .frame(maxWidth: .infinity, minHeight: 180)
            } else if mode == .baseline {
                BaselineChart(points: data, line: MarketsTheme.accent, fill: true)
                    .frame(height: 220)
            } else {
                CandleChart(points: data)
                    .frame(height: 220)
            }
        }
    }
}

/// Path/Shape charts — avoids Swift Charts and Canvas Color shading crashes in scroll views.
private struct BaselineChart: View {
    let points: [CandlePoint]
    let line: Color
    var fill: Bool = true

    var body: some View {
        GeometryReader { geo in
            let rect = geo.frame(in: .local)
            let path = Self.linePath(points: points, in: rect)
            ZStack {
                if fill {
                    path
                        .closeBaseline(in: rect)
                        .fill(line.opacity(0.22))
                }
                path.stroke(line, lineWidth: 1.8)
            }
        }
        .accessibilityHidden(true)
    }

    private static func linePath(points: [CandlePoint], in rect: CGRect) -> Path {
        var path = Path()
        guard points.count >= 2, rect.width > 1, rect.height > 1 else { return path }
        let closes = points.map(\.close)
        guard let minY = closes.min(), let maxY = closes.max(), minY.isFinite, maxY.isFinite else { return path }
        let span = max(maxY - minY, 0.0001)
        let pad: CGFloat = 6
        let w = rect.width - pad * 2
        let h = rect.height - pad * 2
        for (i, point) in points.enumerated() {
            let x = pad + w * CGFloat(i) / CGFloat(points.count - 1)
            let y = pad + h * (1 - CGFloat((point.close - minY) / span))
            let pt = CGPoint(x: x, y: y)
            if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
        }
        return path
    }
}

private extension Path {
    func closeBaseline(in rect: CGRect) -> Path {
        var path = self
        guard !path.isEmpty else { return path }
        let pad: CGFloat = 6
        path.addLine(to: CGPoint(x: rect.width - pad, y: rect.height - pad))
        path.addLine(to: CGPoint(x: pad, y: rect.height - pad))
        path.closeSubpath()
        return path
    }
}

private struct CandleChart: View {
    let points: [CandlePoint]

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            if let metrics = Self.metrics(for: points, size: size) {
                ZStack(alignment: .topLeading) {
                    ForEach(Array(points.enumerated()), id: \.offset) { index, point in
                        let cx = metrics.pad + metrics.plotW * CGFloat(index) / CGFloat(max(points.count - 1, 1))
                        let up = point.close >= point.open
                        let color = up ? MarketsTheme.up : MarketsTheme.down
                        let yHigh = metrics.y(point.high)
                        let yLow = metrics.y(point.low)
                        let yTop = metrics.y(max(point.open, point.close))
                        let yBottom = metrics.y(min(point.open, point.close))

                        Path { path in
                            path.move(to: CGPoint(x: cx, y: yHigh))
                            path.addLine(to: CGPoint(x: cx, y: yLow))
                        }
                        .stroke(color, lineWidth: 1)

                        Rectangle()
                            .fill(color)
                            .frame(width: metrics.barW, height: max(1, yBottom - yTop))
                            .position(x: cx, y: (yTop + yBottom) / 2)
                    }
                }
            }
        }
        .accessibilityHidden(true)
    }

    private struct Metrics {
        let pad: CGFloat
        let plotW: CGFloat
        let barW: CGFloat
        let y: (Double) -> CGFloat
    }

    private static func metrics(for points: [CandlePoint], size: CGSize) -> Metrics? {
        guard points.count >= 2, size.width > 1, size.height > 1 else { return nil }
        let lows = points.map(\.low)
        let highs = points.map(\.high)
        guard let minY = lows.min(), let maxY = highs.max(), minY.isFinite, maxY.isFinite else { return nil }
        let span = max(maxY - minY, 0.0001)
        let pad: CGFloat = 6
        let plotW = size.width - pad * 2
        let plotH = size.height - pad * 2
        let barW = max(2, min(5, plotW / CGFloat(points.count) * 0.55))
        return Metrics(
            pad: pad,
            plotW: plotW,
            barW: barW,
            y: { value in pad + plotH * (1 - CGFloat((value - minY) / span)) }
        )
    }
}

struct NewsRow: View {
    let article: NewsArticle
    var showBadge: Bool = true

    var body: some View {
        Group {
            if let url = article.url, url.scheme == "http" || url.scheme == "https" {
                Link(destination: url) { content }
            } else {
                content
            }
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 6) {
            if showBadge {
                Text(article.related.isEmpty ? "MARKET" : article.related)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(MarketsTheme.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(MarketsTheme.accent.opacity(0.12), in: Capsule())
            }
            Text(article.headline)
                .font(.body.weight(.semibold))
                .foregroundStyle(MarketsTheme.text)
                .multilineTextAlignment(.leading)
            HStack(spacing: 6) {
                Text(article.source)
                if article.datetime.timeIntervalSince1970 > 0 {
                    Text("·")
                    Text(article.datetime, style: .relative)
                }
            }
            .font(.caption)
            .foregroundStyle(MarketsTheme.muted)
            if !article.summary.isEmpty {
                Text(article.summary)
                    .font(.footnote)
                    .foregroundStyle(MarketsTheme.muted)
                    .lineLimit(3)
            }
        }
        .padding(.vertical, 6)
    }
}

struct QuoteChangeText: View {
    let quote: Quote?
    var body: some View {
        if let quote {
            Text(Formatters.pct(quote.changePercent))
                .font(.caption.monospacedDigit().weight(.semibold))
                .foregroundStyle(quote.isUp ? MarketsTheme.up : MarketsTheme.down)
        } else {
            Text("—").foregroundStyle(MarketsTheme.muted)
        }
    }
}
