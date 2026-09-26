// Shown inside the workspace while a page renders, so navigation never feels frozen.
export default function Loading() {
    return (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
            <div className="flex flex-col gap-2 px-1 pt-1">
                <span className="h-7 w-48 animate-pulse rounded-lg bg-hover" />
                <span className="h-4 w-72 animate-pulse rounded-md bg-hover/70" />
            </div>
            <section className="hatch">
                <div className="bento">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bento-tile h-[124px]"><span className="h-full animate-pulse rounded-lg bg-hover/60" /></div>
                    ))}
                </div>
            </section>
            <section className="hatch">
                <div className="card h-[420px] animate-pulse" />
            </section>
        </div>
    );
}
