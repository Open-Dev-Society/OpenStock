import React from "react";

// Top of every public page: kicker, one headline, one supporting line, optional actions.
export default function PageHero({ kicker, title, sub, children }: { kicker: string; title: React.ReactNode; sub?: string; children?: React.ReactNode }) {
    return (
        <section className="mx-auto max-w-[1200px] px-5 pt-14 md:pt-20">
            <p className="kicker text-brand-ink">{kicker}</p>
            <h1 className="mt-3 max-w-3xl text-[40px] font-bold leading-[1.04] tracking-[-0.05em] md:text-[60px]">{title}</h1>
            {sub && <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">{sub}</p>}
            {children && <div className="mt-8 flex flex-wrap gap-2">{children}</div>}
        </section>
    );
}
