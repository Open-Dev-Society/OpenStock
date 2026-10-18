import Link from 'next/link';

export default function SignUpCta({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
    return (
        <div className="hatch">
            <div className="card flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center">
                <div>
                    <h2 className="text-[22px] font-bold tracking-[-0.03em]">{title}</h2>
                    <p className="mt-1 max-w-xl text-muted-foreground">{body}</p>
                </div>
                <Link href={href} className="btn btn-primary h-11 px-5 text-[15px]">{label}</Link>
            </div>
        </div>
    );
}
