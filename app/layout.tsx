import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import {Toaster} from "@/components/ui/sonner";
import "./globals.css";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getDictionary, type Locale } from "@/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenStock",
  description: "OpenStock is an open-source alternative to expensive market platforms. Track real-time prices, set personalized alerts, and explore detailed company insights — built openly, for everyone, forever free.",
};

const locales: Locale[] = ['en', 'zh-CN'];
const defaultLocale: Locale = 'en';

export default async function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale;
    const locale: Locale = localeCookie && locales.includes(localeCookie) ? localeCookie : defaultLocale;
    const dictionary = getDictionary(locale);

    return (
        <html lang={locale} className="dark">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <LocaleProvider locale={locale} dictionary={dictionary}>
                    {children}
                </LocaleProvider>
                <Toaster/>
                <Analytics />
            </body>
        </html>
    );
}
