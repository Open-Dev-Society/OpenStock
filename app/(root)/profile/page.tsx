import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Bell, KeyRound, ShieldCheck, Star } from "lucide-react";
import Panel from "@/components/Panel";
import ProfileForm from "@/components/profile/ProfileForm";
import PasswordForm from "@/components/profile/PasswordForm";
import { auth, getSession } from "@/lib/better-auth/auth";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { getUserAlerts } from "@/lib/actions/alert.actions";
import { alertsEnabled } from "@/lib/market-data";
import { getLang } from "@/lib/i18n-server";
import { methodLabel, tx, type Lang } from "@/lib/i18n";

export const generateMetadata = async () => {
    const lang = await getLang();
    return { title: `${tx(lang, 'profile.title')} | OpenStock` };
};

// Google and GitHub keep their brand names, so only credentials are looked up in the dictionary.
const METHOD_LABELS: Record<string, string> = {
    credential: 'Email and password',
    google: 'Google',
    github: 'GitHub',
};
const methodName = (lang: Lang, id: string) => methodLabel(lang, id, METHOD_LABELS[id] ?? id);

export default async function ProfilePage() {
    const session = await getSession();
    if (!session?.user) redirect('/sign-in');
    const { user } = session;

    const [accounts, watchlist, alerts] = await Promise.all([
        auth.api.listUserAccounts({ headers: await headers() }).catch(() => []),
        getUserWatchlist(),
        getUserAlerts(),
    ]);
    const linked = new Set(accounts.map((a: { providerId: string }) => a.providerId));
    const activeAlerts = alerts.filter((a: { triggered?: boolean }) => !a.triggered).length;
    const lang = await getLang();
    const memberSince = new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'long', year: 'numeric' });

    const stats = [
        { label: tx(lang, 'profile.watching'), value: watchlist.length, icon: Star },
        { label: alertsEnabled ? tx(lang, 'profile.alerts') : tx(lang, 'profile.alertsPaused'), value: activeAlerts, icon: Bell },
        { label: tx(lang, 'profile.methods'), value: linked.size, icon: ShieldCheck },
    ];

    return (
        <>
            <section className="hatch">
                <div className="card flex flex-wrap items-center gap-4 p-5">
                    <span className="grid size-14 flex-none place-items-center rounded-full bg-brand-soft text-[22px] font-bold text-brand-ink">
                        {user.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-[22px] font-bold tracking-[-0.03em]">{user.name}</h1>
                        <p className="truncate text-faint">{user.email} · {tx(lang, 'profile.since').replace('{d}', memberSince)}</p>
                    </div>
                </div>
                <div className="bento mt-[3px]">
                    {stats.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bento-tile col-span-4 gap-2.5 max-lg:col-span-12">
                            <div className="bento-head"><span className="bento-ico"><Icon /></span>{label}</div>
                            <p className="bento-value text-[26px]">{value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                <Panel title={tx(lang, 'profile.details')} sub={tx(lang, 'profile.detailsSub')}>
                    <ProfileForm
                        lang={lang}
                        initial={{
                            name: user.name,
                            country: user.country ?? 'US',
                            investmentGoals: user.investmentGoals ?? 'Growth',
                            riskTolerance: user.riskTolerance ?? 'Medium',
                            preferredIndustry: user.preferredIndustry ?? 'Technology',
                        }}
                    />
                </Panel>

                <div className="flex min-w-0 flex-col gap-3">
                    <Panel title={tx(lang, 'profile.signin')} sub={tx(lang, 'profile.signinSub')}>
                        <ul className="row-list">
                            {[...linked].map((id) => (
                                <li key={id} className="flex items-center gap-3 px-3.5 py-3">
                                    <span className="bento-ico"><KeyRound /></span>
                                    <span className="flex-1 font-semibold">{methodName(lang, id)}</span>
                                    <span className="pill is-up">{tx(lang, 'profile.connected')}</span>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    {linked.has('credential') && (
                        <Panel title={tx(lang, 'profile.password')} sub={tx(lang, 'profile.passwordSub')}>
                            <PasswordForm lang={lang} />
                        </Panel>
                    )}
                </div>
            </div>
        </>
    );
}
