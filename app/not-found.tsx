import Link from 'next/link';
import { Compass } from 'lucide-react';
import { getLang } from '@/lib/i18n-server';
import { tx } from '@/lib/i18n';

// Next's default 404 is an English sentence. This one follows the interface language and offers a
// way back into the app.
export default async function NotFound() {
    const lang = await getLang();

    return (
        <main className="grid min-h-dvh place-items-center p-6">
            <div className="card hatch w-full max-w-md p-6 text-center">
                <span className="empty-icon mx-auto"><Compass className="size-5" /></span>
                <h1 className="mt-3 text-xl font-bold tracking-[-0.02em] text-foreground">{tx(lang, 'notFound.title')}</h1>
                <p className="mt-1.5 text-[13.5px] text-muted-foreground">{tx(lang, 'notFound.sub')}</p>
                <Link href="/dashboard" className="btn btn-primary mt-5 inline-flex h-10">
                    {tx(lang, 'notFound.home')}
                </Link>
            </div>
        </main>
    );
}
