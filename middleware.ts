import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { isPublicPath } from '@/lib/public-paths';

export async function middleware(request: NextRequest) {
    // Marketing, public ticker and comparison pages, robots.txt and sitemap.xml.
    // The signed-in app (/stocks, /dashboard, /watchlist, /profile) still requires a session cookie.
    if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

    const sessionCookie = getSessionCookie(request);

    // Check cookie presence - prevents obviously unauthorized users
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // robots.txt and sitemap.xml are excluded so a crawler is never sent to sign-in,
        // even if the public-path list above is edited later.
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sign-in|sign-up|forgot-password|reset-password|assets).*)',
    ],
};
