import Header from "@/components/Header";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

const Layout = async ({ children }: { children: React.ReactNode }) => {
    let user = {
        id: "guest",
        name: "Guest",
        email: "guest@openstock.dev",
    };

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (session?.user) {
            user = {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
            };
        }
    } catch (_) {}

    return (
        <main className="min-h-screen text-gray-400">
            <Header user={user} />

            <div className="container py-10">
                {children}
            </div>
        </main>
    )
}
export default Layout