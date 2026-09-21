import SwiftUI

struct AddStocksSheet: View {
    @EnvironmentObject private var store: WatchlistStore
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var busy = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Enter one or more tickers, separated by commas.")
                    .font(.subheadline)
                    .foregroundStyle(MarketsTheme.muted)
                TextField("AAPL, MSFT, SCHD", text: $text, axis: .vertical)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding(12)
                    .frame(minHeight: 110, alignment: .topLeading)
                    .background(MarketsTheme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundStyle(MarketsTheme.text)
                Spacer()
            }
            .padding(16)
            .background(MarketsTheme.bg.ignoresSafeArea())
            .navigationTitle("Add Stock")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task {
                            busy = true
                            defer { busy = false }
                            await store.addTickers(text)
                            dismiss()
                        }
                    }
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || busy)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

enum SearchMode { case focus, add }

struct SearchSheet: View {
    @EnvironmentObject private var store: WatchlistStore
    @Environment(\.dismiss) private var dismiss
    var mode: SearchMode = .focus

    @State private var query = ""
    @State private var results: [(symbol: String, description: String)] = []
    @State private var searching = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(results, id: \.symbol) { hit in
                    Button {
                        Task {
                            if mode == .add || !store.items.contains(where: { $0.symbol == hit.symbol }) {
                                await store.addTickers(hit.symbol)
                            }
                            store.select(hit.symbol)
                            dismiss()
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(hit.symbol)
                                .font(.headline)
                                .foregroundStyle(MarketsTheme.text)
                            Text(hit.description)
                                .font(.subheadline)
                                .foregroundStyle(MarketsTheme.muted)
                                .lineLimit(2)
                        }
                    }
                    .listRowBackground(MarketsTheme.card)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(MarketsTheme.bg.ignoresSafeArea())
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, prompt: "Ticker or company")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
            .onChange(of: query) { newValue in
                Task { await runSearch(newValue) }
            }
            .task { await runSearch("") }
            .overlay { if searching { ProgressView() } }
        }
    }

    private func runSearch(_ q: String) async {
        searching = true
        defer { searching = false }
        try? await Task.sleep(nanoseconds: 220_000_000)
        guard !Task.isCancelled else { return }
        results = (try? await FinnhubClient.shared.search(query: q)) ?? []
    }
}
