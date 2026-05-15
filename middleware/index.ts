import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from "better-auth/cookies";
import type { Locale } from '@/i18n';

const locales: Locale[] = ['en', 'zh-CN'];
const defaultLocale: Locale = 'en';

function getLocaleFromCookies(request: NextRequest): Locale {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value as Locale;
    if (cookieLocale && locales.includes(cookieLocale)) {
        return cookieLocale;
    }
    return defaultLocale;
}

export async function middleware(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);

    // Check cookie presence - prevents obviously unauthorized users
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Detect locale and set in headers for server components
    const locale = getLocaleFromCookies(request);
    const response = NextResponse.next();
    response.headers.set('x-locale', locale);

    return response;
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|forgot-password|reset-password|assets).*)',
    ],
};
