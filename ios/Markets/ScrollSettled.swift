import SwiftUI

/// Tracks whether the enclosing ScrollView is at rest.
///
/// The Watchlist screen mounts heavy panels and swaps news content in after network
/// tasks resolve. On iOS 26 (UICollectionView-backed ScrollView) inserting content
/// into a LazyVStack while a scroll gesture/fling is active can crash the app, so
/// post-load content changes are held until the scroll settles.
///
/// Default is `true` so callers that are not attached to a tracking ScrollView
/// (sheets, other tabs, iOS 16/17 fallback) behave exactly as before.
private struct ScrollSettledKey: EnvironmentKey {
    static let defaultValue = true
}

extension EnvironmentValues {
    var scrollSettled: Bool {
        get { self[ScrollSettledKey.self] }
        set { self[ScrollSettledKey.self] = newValue }
    }
}

extension View {
    /// Availability wrapper: on iOS 18+ the scroll phase drives `scrollSettled`;
    /// on older releases the value stays `true` (previous behavior, no gating).
    @ViewBuilder
    func reportsScrollPhase(to settled: Binding<Bool>) -> some View {
        if #available(iOS 18.0, *) {
            self.onScrollPhaseChange { _, newPhase in
                settled.wrappedValue = (newPhase == .idle)
            }
        } else {
            self
        }
    }
}
