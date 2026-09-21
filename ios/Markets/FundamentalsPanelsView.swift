import SwiftUI

struct FundamentalsPanelsView: View {
    let fundamentals: CompanyFundamentals?
    let loading: Bool
    @State private var incomeFreq: IncomeFreq = .annual

    enum IncomeFreq: String, CaseIterable {
        case annual = "Annual"
        case quarterly = "Quarterly"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            keyStatsCard
            performanceCard
            earningsCard
            dividendsCard
            incomeCard
            profileCard
        }
    }

    private var keyStatsCard: some View {
        SectionCard(title: "Key Stats", subtitle: "Finnhub metrics + quote volume") {
            if let s = fundamentals?.keyStats {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    metric("Market Cap", Formatters.compactMillions(s.marketCap))
                    metric("P/E", num(s.pe))
                    metric("EPS", num(s.eps))
                    metric("Div Yield", Formatters.pct(s.dividendYield))
                    metric("Volume", Formatters.compactCount(s.volume))
                    metric("Avg Vol 10d", Formatters.compactCount(s.avgVolume10d))
                    metric("Avg Vol 30d", Formatters.compactCount(s.avgVolume30d))
                    metric("Beta", num(s.beta))
                    metric("52W High", num(s.week52High))
                    metric("52W Low", num(s.week52Low))
                    if let days = s.daysToEarnings, let date = s.nextEarningsDate {
                        metric("Next Earnings", "in \(days)d")
                        metric("Earnings Date", Formatters.day(date))
                    } else {
                        metric("Next Earnings", "—")
                        metric("Earnings Date", "—")
                    }
                }
            } else {
                placeholder
            }
        }
    }

    private var performanceCard: some View {
        SectionCard(title: "Performance", subtitle: "Price returns") {
            if let p = fundamentals?.performance {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    metric("1W", Formatters.pct(p.return1w))
                    metric("1M", Formatters.pct(p.return1m))
                    metric("3M", Formatters.pct(p.return3m))
                    metric("6M", Formatters.pct(p.return6m))
                    metric("YTD", Formatters.pct(p.returnYtd))
                    metric("1Y", Formatters.pct(p.return1y))
                }
            } else {
                placeholder
            }
        }
    }

    private var earningsCard: some View {
        SectionCard(title: "Earnings", subtitle: "Last 4 quarters — actual vs estimate") {
            if let rows = fundamentals?.earnings, !rows.isEmpty {
                VStack(spacing: 0) {
                    headerRow(["Period", "Actual", "Est.", "Surp%"])
                    ForEach(rows) { row in
                        dataRow([
                            row.period,
                            num(row.actual),
                            num(row.estimate),
                            Formatters.pct(row.surprisePercent),
                        ])
                    }
                }
            } else {
                Text(loading ? "Loading…" : "No earnings data (plan-dependent).")
                    .font(.subheadline)
                    .foregroundStyle(MarketsTheme.muted)
            }
        }
    }

    private var dividendsCard: some View {
        SectionCard(title: "Dividends", subtitle: "Recent dividend history") {
            if let rows = fundamentals?.dividends, !rows.isEmpty {
                VStack(spacing: 0) {
                    headerRow(["Ex-Date", "Pay", "Amount"])
                    ForEach(rows.prefix(8)) { row in
                        dataRow([
                            Formatters.day(row.exDate),
                            Formatters.day(row.payDate),
                            String(format: "%.4f%@", row.amount, row.currency.map { " \($0)" } ?? ""),
                        ])
                    }
                }
            } else {
                Text(loading ? "Loading…" : "No dividend history.")
                    .font(.subheadline)
                    .foregroundStyle(MarketsTheme.muted)
            }
        }
    }

    private var incomeCard: some View {
        SectionCard(title: "Income Statement", subtitle: "Revenue / operating / net income") {
            Picker("Frequency", selection: $incomeFreq) {
                ForEach(IncomeFreq.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)

            let rows = incomeFreq == .annual
                ? (fundamentals?.incomeAnnual ?? [])
                : (fundamentals?.incomeQuarterly ?? [])

            if rows.isEmpty {
                Text(loading ? "Loading…" : "No income statement data (plan-dependent).")
                    .font(.subheadline)
                    .foregroundStyle(MarketsTheme.muted)
                    .padding(.top, 8)
            } else {
                VStack(spacing: 0) {
                    headerRow(["Period", "Revenue", "OpInc", "Net"])
                    ForEach(rows.prefix(6)) { row in
                        dataRow([
                            row.period,
                            Formatters.compactCount(row.revenue),
                            Formatters.compactCount(row.operatingIncome),
                            Formatters.compactCount(row.netIncome),
                        ])
                    }
                }
                .padding(.top, 8)
            }
        }
    }

    private var profileCard: some View {
        SectionCard(title: "Profile", subtitle: "Company identifiers") {
            if let p = fundamentals?.profile {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    metric("Industry", p.industry ?? "—")
                    metric("Country", p.country ?? "—")
                    metric("Employees", p.employees.map { $0.formatted() } ?? "—")
                    metric("IPO", p.ipo ?? "—")
                    metric("ISIN", p.isin ?? "—")
                    metric("CUSIP", p.cusip ?? "—")
                }
                if let website = p.website {
                    Link(website.host ?? website.absoluteString, destination: website)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(MarketsTheme.accent)
                        .padding(.top, 4)
                }
            } else {
                placeholder
            }
        }
    }

    private var placeholder: some View {
        Text(loading ? "Loading…" : "No data.")
            .font(.subheadline)
            .foregroundStyle(MarketsTheme.muted)
    }

    private func metric(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(MarketsTheme.muted)
            Text(value)
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .foregroundStyle(MarketsTheme.text)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(MarketsTheme.bg, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func headerRow(_ cols: [String]) -> some View {
        HStack {
            ForEach(cols, id: \.self) { col in
                Text(col)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(MarketsTheme.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.vertical, 6)
    }

    private func dataRow(_ cols: [String]) -> some View {
        HStack {
            ForEach(Array(cols.enumerated()), id: \.offset) { _, col in
                Text(col)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(MarketsTheme.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .padding(.vertical, 6)
        .overlay(alignment: .bottom) {
            Divider().overlay(MarketsTheme.border)
        }
    }

    private func num(_ value: Double?) -> String {
        guard let value, value.isFinite else { return "—" }
        return String(format: "%.2f", value)
    }
}
