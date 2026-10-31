import { getSession } from "@/lib/better-auth/auth";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import HtmlLang from "@/components/HtmlLang";
import AppShell from "@/components/shell/AppShell";
import DonatePopup from "@/components/DonatePopup";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";

const Layout = async ({ children }: { children: React.ReactNode }) => {
    const session = await getSession();

    if (!session?.user) redirect('/sign-in');

    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    }

    const [initialStocks, watchlist, locale] = await Promise.all([
        searchStocks(),
        getUserWatchlist(),
        getLocale(),
    ]);

    return (
        <NextIntlClientProvider>
            <HtmlLang locale={locale} />
            <AppShell
                user={user}
                watchlist={watchlist.map(({ symbol, company }: { symbol: string; company: string }) => ({ symbol, company }))}
                initialStocks={initialStocks}
            >
                {children}
            </AppShell>
            <DonatePopup />
        </NextIntlClientProvider>
    )
}
export default Layout
