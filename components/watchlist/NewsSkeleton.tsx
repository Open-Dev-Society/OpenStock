// Placeholder for a news panel while its feed is in flight. Shared by the watchlist, the dashboard
// and the stock page so a slow provider looks the same everywhere.
const NewsSkeleton = ({ rows = 4 }: { rows?: number }) => (
    <div className="row-list" aria-busy="true">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3.5">
                <span className="h-5 w-16 animate-pulse rounded-full bg-hover" />
                <span className="h-3.5 flex-1 animate-pulse rounded-md bg-hover" />
            </div>
        ))}
    </div>
);

export default NewsSkeleton;
