export default function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
    return (
        <div className="mb-8 max-w-2xl">
            <p className="kicker text-brand-ink">{kicker}</p>
            <h2 className="mt-2 text-[32px] font-bold leading-[1.1] tracking-[-0.04em] md:text-[40px]">{title}</h2>
            {sub && <p className="mt-3 text-[16px] text-muted-foreground">{sub}</p>}
        </div>
    );
}
